/**
 * Convert Command
 * Convert an iOS Shortcut file (.shortcut, which is a plist archive)
 * into the JSON shape expected by the Knowledge Base uploader.
 *
 * Usage:
 *   shortcut-genius convert <path-to-shortcut-file> [--out output.json]
 *
 * The output JSON matches the format the web app's `/api/knowledge-base/upload`
 * endpoint expects: { shortcut_name, actions, action_count, complexity_score, ... }
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
// plist is a dependency declared in package.json. iOS .shortcut files are
// binary plists (bplist00) — `plist` parses both XML and binary variants.
// @ts-expect-error - no bundled types for plist; runtime API is stable.
import plist from 'plist';

interface ShortcutAction {
  WFWorkflowActionIdentifier: string;
  WFWorkflowActionParameters?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ShortcutPlist {
  WFWorkflowActions?: ShortcutAction[];
  WFWorkflowName?: string;
  WFWorkflowInputContentItemClasses?: string[];
  [key: string]: unknown;
}

function computeComplexityScore(actions: ShortcutAction[]): number {
  if (!actions || actions.length === 0) return 0;
  // Rough heuristic: 1 point per action + 0.5 per non-empty parameter object.
  const params = actions.reduce((sum, a) => {
    const p = a.WFWorkflowActionParameters;
    return sum + (p && typeof p === 'object' ? Object.keys(p).length : 0);
  }, 0);
  return Math.round((actions.length + params * 0.5) * 10) / 10;
}

export const convertCommand = new Command('convert')
  .description('Convert an iOS .shortcut file (plist) into Knowledge Base JSON')
  .argument('<file>', 'Path to a .shortcut file exported from the iOS Shortcuts app')
  .option('-o, --out <path>', 'Output JSON path (default: <name>.shortcut.json next to input)')
  .option('--pretty', 'Pretty-print JSON output (default: true)', true)
  .action(async (file: string, options: { out?: string; pretty?: boolean }) => {
    const absIn = path.resolve(file);
    try {
      await fs.access(absIn);
    } catch {
      console.error(chalk.red(`File not found: ${absIn}`));
      process.exit(1);
    }

    const raw = await fs.readFile(absIn, 'utf8');
    let parsed: ShortcutPlist;
    try {
      parsed = plist.parse(raw) as ShortcutPlist;
    } catch (err) {
      console.error(chalk.red(`Failed to parse plist. Is this an iOS Shortcut export?`));
      console.error((err as Error).message);
      process.exit(2);
    }

    const name = parsed.WFWorkflowName || path.basename(absIn, '.shortcut');
    const actions = parsed.WFWorkflowActions || [];
    const out = {
      shortcut_name: name,
      actions,
      action_count: actions.length,
      complexity_score: computeComplexityScore(actions),
      source_file: path.basename(absIn),
      converted_at: new Date().toISOString(),
    };

    const outPath = path.resolve(
      options.out || `${absIn.replace(/\.shortcut$/i, '')}.shortcut.json`
    );
    await fs.writeFile(
      outPath,
      options.pretty === false ? JSON.stringify(out) : JSON.stringify(out, null, 2),
      'utf8'
    );

    console.log(
      chalk.green(`✓ Converted ${name}`) +
        chalk.gray(` — ${actions.length} actions, complexity ${out.complexity_score}`) +
        `\n  ${chalk.cyan(outPath)}`
    );
  });