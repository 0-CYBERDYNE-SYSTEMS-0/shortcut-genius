import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import plist from 'plist';

import type { Shortcut, ShortcutSourceFormat } from '../client/src/lib/shortcuts';
import { validateShortcut, isAppleActionIdentifier } from '../client/src/lib/shortcuts';
import { convertToPlist, importShortcutArtifact, validateAppleCompatibility } from './shortcut-builder';

const execFileAsync = promisify(execFile);

export type DebugPrimitive =
  | 'validate'
  | 'format-json'
  | 'format-plist'
  | 'extract-actions'
  | 'extract-urls'
  | 'extract-key-path'
  | 'xpath';

export interface DebugPrimitiveRequest {
  primitive: DebugPrimitive;
  shortcut?: Shortcut | null;
  rawInput?: string;
  rawFormat?: 'auto' | 'json' | 'plist' | 'xml';
  query?: string;
  sourceMode?: 'current-shortcut' | 'current-plist' | 'pasted';
}

export interface DebugPrimitiveResponse {
  title: string;
  summary: string;
  output: string;
  language: 'text' | 'json' | 'xml' | 'bash';
  sourceFormat: ShortcutSourceFormat | 'xml' | 'unknown';
  suggestedCommands: string[];
}

type ResolvedSource = {
  sourceFormat: ShortcutSourceFormat | 'xml' | 'unknown';
  shortcut?: Shortcut;
  data?: unknown;
  rawText?: string;
};

function isLikelyJsonArtifact(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function isLikelyXml(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<');
}

function isLikelyPlist(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<plist');
}

async function withTempFile<T>(contents: string, extension: string, task: (filePath: string) => Promise<T>): Promise<T> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shortcut-debug-'));
  const filePath = path.join(tempDir, `artifact.${extension}`);

  try {
    await fs.writeFile(filePath, contents, 'utf8');
    return await task(filePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runXmllint(args: string[], contents: string) {
  return withTempFile(contents, 'xml', async (filePath) => {
    return execFileAsync('xmllint', [...args, filePath], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  });
}

function collectUrls(value: unknown, results = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/g);
    if (matches) {
      matches.forEach((match) => results.add(match));
    }
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, results));
    return results;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectUrls(item, results));
  }

  return results;
}

function summarizeActions(shortcut: Shortcut | undefined, data: unknown) {
  const counts = new Map<string, number>();

  if (shortcut) {
    shortcut.actions.forEach((action) => {
      counts.set(action.type, (counts.get(action.type) || 0) + 1);
    });
  } else if (data && typeof data === 'object' && Array.isArray((data as any).WFWorkflowActions)) {
    for (const action of (data as any).WFWorkflowActions) {
      const identifier = action?.WFWorkflowActionIdentifier || 'unknown';
      counts.set(identifier, (counts.get(identifier) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([identifier, count]) => ({
      identifier,
      count,
      mapped: isAppleActionIdentifier(identifier),
    }));
}

function tokenizePath(query: string) {
  return query
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function expandSegment(segment: string) {
  const pieces: Array<{ key?: string; index?: number | '*'}> = [];
  const baseMatch = segment.match(/^[^\[]+/);
  if (baseMatch) {
    pieces.push({ key: baseMatch[0] });
  }

  const bracketMatches = segment.match(/\[[^\]]+\]/g) || [];
  bracketMatches.forEach((match) => {
    const value = match.slice(1, -1);
    pieces.push({ index: value === '*' ? '*' : Number.parseInt(value, 10) });
  });

  if (!baseMatch && bracketMatches.length === 0) {
    pieces.push({ key: segment });
  }

  return pieces;
}

function queryObjectPath(data: unknown, query: string): unknown[] {
  const segments = tokenizePath(query);
  let current: unknown[] = [data];

  for (const segment of segments) {
    const instructions = expandSegment(segment);

    for (const instruction of instructions) {
      const next: unknown[] = [];
      for (const value of current) {
        if (instruction.key !== undefined) {
          if (value && typeof value === 'object' && instruction.key in (value as Record<string, unknown>)) {
            next.push((value as Record<string, unknown>)[instruction.key]);
          }
          continue;
        }

        if (!Array.isArray(value)) {
          continue;
        }

        if (instruction.index === '*') {
          next.push(...value);
        } else if (typeof instruction.index === 'number' && value[instruction.index] !== undefined) {
          next.push(value[instruction.index]);
        }
      }
      current = next;
    }
  }

  return current;
}

async function resolveSource(request: DebugPrimitiveRequest): Promise<ResolvedSource> {
  if (request.sourceMode === 'current-shortcut') {
    if (!request.shortcut) {
      throw new Error('No current shortcut available.');
    }

    return {
      sourceFormat: request.shortcut._provenance?.sourceFormat || 'json',
      shortcut: request.shortcut,
      data: request.shortcut,
      rawText: JSON.stringify(request.shortcut, null, 2),
    };
  }

  if (request.sourceMode === 'current-plist') {
    if (!request.shortcut) {
      throw new Error('No current shortcut available.');
    }

    const rawText = request.shortcut._provenance?.rawPlist || convertToPlist(request.shortcut).toString('utf8');
    return {
      sourceFormat: request.shortcut._provenance?.sourceFormat || 'plist',
      shortcut: request.shortcut,
      data: plist.parse(rawText),
      rawText,
    };
  }

  const rawInput = request.rawInput?.trim();
  if (!rawInput) {
    throw new Error('Paste JSON, plist, or XML to use the console on ad hoc artifacts.');
  }

  const rawFormat = request.rawFormat || 'auto';
  if (rawFormat === 'json' || (rawFormat === 'auto' && isLikelyJsonArtifact(rawInput))) {
    const data = JSON.parse(rawInput);
    const shortcut = data && typeof data === 'object' && 'name' in (data as Record<string, unknown>) && 'actions' in (data as Record<string, unknown>)
      ? data as Shortcut
      : undefined;

    return {
      sourceFormat: 'json',
      shortcut,
      data,
      rawText: rawInput,
    };
  }

  if (rawFormat === 'plist' || (rawFormat === 'auto' && isLikelyPlist(rawInput))) {
    const imported = await importShortcutArtifact(Buffer.from(rawInput, 'utf8'), {
      fileName: 'pasted.plist',
      importIntent: 'debug',
    });

    return {
      sourceFormat: imported.metadata.sourceFormat,
      shortcut: imported.shortcut,
      data: imported.shortcut._provenance?.rawAppleShortcut || plist.parse(rawInput),
      rawText: imported.shortcut._provenance?.rawPlist || rawInput,
    };
  }

  if (rawFormat === 'xml' || (rawFormat === 'auto' && isLikelyXml(rawInput))) {
    return {
      sourceFormat: 'xml',
      data: rawInput,
      rawText: rawInput,
    };
  }

  throw new Error('Unable to determine artifact format. Choose JSON, plist, or XML explicitly.');
}

export async function runDebugPrimitive(request: DebugPrimitiveRequest): Promise<DebugPrimitiveResponse> {
  const source = await resolveSource(request);

  switch (request.primitive) {
    case 'validate': {
      if (source.sourceFormat === 'xml') {
        try {
          await runXmllint(['--noout'], source.rawText || '');
          return {
            title: 'XML validation',
            summary: 'XML is well-formed.',
            output: 'xmllint reported no structural XML errors.',
            language: 'text',
            sourceFormat: 'xml',
            suggestedCommands: ['xmllint --noout artifact.xml'],
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'xmllint validation failed');
        }
      }

      const shortcut = source.shortcut;
      const validationErrors = shortcut ? validateShortcut(shortcut) : [];
      const compatibilityErrors = shortcut ? validateAppleCompatibility(shortcut) : [];
      const result = {
        shortcutName: shortcut?.name || null,
        actionCount: shortcut?.actions.length || null,
        validationErrors,
        compatibilityErrors,
        sourceFormat: source.sourceFormat,
      };

      return {
        title: 'Validation report',
        summary: validationErrors.length === 0 && compatibilityErrors.length === 0
          ? 'No structural or Apple compatibility errors found.'
          : `Found ${validationErrors.length + compatibilityErrors.length} issue(s).`,
        output: JSON.stringify(result, null, 2),
        language: 'json',
        sourceFormat: source.sourceFormat,
        suggestedCommands: [
          'jq \'.\' artifact.json',
          'plutil -lint artifact.plist',
          'xmllint --noout artifact.xml',
        ],
      };
    }

    case 'format-json': {
      const output = JSON.stringify(source.shortcut || source.data, null, 2);
      return {
        title: 'Formatted JSON',
        summary: 'Normalized JSON view of the current source.',
        output,
        language: 'json',
        sourceFormat: source.sourceFormat,
        suggestedCommands: ['jq \'.\' artifact.json'],
      };
    }

    case 'format-plist': {
      let output: string;

      if (source.sourceFormat === 'xml') {
        try {
          const result = await runXmllint(['--format'], source.rawText || '');
          output = result.stdout;
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Failed to pretty print XML');
        }
      } else if (source.shortcut) {
        output = convertToPlist(source.shortcut).toString('utf8');
      } else if (source.data && typeof source.data === 'object') {
        output = plist.build(source.data as plist.PlistObject);
      } else {
        throw new Error('No plist-capable source available.');
      }

      return {
        title: 'Formatted PLIST/XML',
        summary: 'Pretty-printed XML suitable for inspection or export.',
        output,
        language: 'xml',
        sourceFormat: source.sourceFormat === 'xml' ? 'xml' : 'plist',
        suggestedCommands: [
          'plutil -convert xml1 -o - artifact.shortcut',
          'xmllint --format artifact.plist',
        ],
      };
    }

    case 'extract-actions': {
      const actions = summarizeActions(source.shortcut, source.data);
      return {
        title: 'Action identifiers',
        summary: `Found ${actions.length} distinct action identifier(s).`,
        output: JSON.stringify(actions, null, 2),
        language: 'json',
        sourceFormat: source.sourceFormat,
        suggestedCommands: [
          'plutil -extract WFWorkflowActions raw -o - artifact.plist',
          'jq \'.actions[].type\' artifact.json',
        ],
      };
    }

    case 'extract-urls': {
      const urls = Array.from(collectUrls(source.shortcut || source.data));
      return {
        title: 'Extracted URLs',
        summary: urls.length === 0 ? 'No URLs found.' : `Found ${urls.length} URL(s).`,
        output: JSON.stringify(urls, null, 2),
        language: 'json',
        sourceFormat: source.sourceFormat,
        suggestedCommands: [
          'jq \'.. | strings | select(test("https?://"))\' artifact.json',
          'xmllint --xpath \'//*[contains(text(),"http")]\' artifact.xml',
        ],
      };
    }

    case 'extract-key-path': {
      if (!request.query?.trim()) {
        throw new Error('Enter a dotted key path like actions[0].parameters or WFWorkflowActions[*].WFWorkflowActionIdentifier.');
      }

      if (!source.data && !source.shortcut) {
        throw new Error('Key-path extraction requires JSON or plist object data.');
      }

      const matches = queryObjectPath(source.shortcut || source.data, request.query.trim());
      return {
        title: 'Key-path extraction',
        summary: matches.length === 0 ? 'No values matched that path.' : `Matched ${matches.length} value(s).`,
        output: JSON.stringify(matches, null, 2),
        language: 'json',
        sourceFormat: source.sourceFormat,
        suggestedCommands: [
          `jq '.${request.query.trim()}' artifact.json`,
          `plutil -extract ${request.query.trim().replace(/\[\*\]/g, '')} raw -o - artifact.plist`,
        ],
      };
    }

    case 'xpath': {
      if (!request.query?.trim()) {
        throw new Error('Enter an XPath expression like //key[text()="WFWorkflowActionIdentifier"]/following-sibling::*[1].');
      }

      if (!source.rawText) {
        throw new Error('XPath requires XML/plist source text.');
      }

      try {
        const result = await runXmllint(['--xpath', request.query.trim()], source.rawText);
        return {
          title: 'XPath extraction',
          summary: 'XPath query executed successfully.',
          output: result.stdout.trim(),
          language: 'xml',
          sourceFormat: source.sourceFormat,
          suggestedCommands: [
            `xmllint --xpath '${request.query.trim()}' artifact.xml`,
          ],
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'XPath extraction failed');
      }
    }
  }
}
