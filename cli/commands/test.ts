/**
 * Test Command
 * Local validation pass for an iOS Shortcut JSON file (output of `convert`
 * or anything matching the Knowledge Base shape).
 *
 * This is a *static* validator — it checks structure, action types against
 * the known action database, and reports obvious problems. It does NOT
 * execute the shortcut on macOS (that requires Shortcuts.app automation and
 * a future release).
 *
 * Usage:
 *   shortcut-genius test <file.shortcut.json> [--verbose]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface ShortcutAction {
  WFWorkflowActionIdentifier?: string;
  WFWorkflowActionParameters?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ShortcutJson {
  shortcut_name?: string;
  actions?: ShortcutAction[];
  action_count?: number;
  complexity_score?: number;
  [key: string]: unknown;
}

const KNOWN_ACTION_PREFIXES = [
  'is.workflow.actions',
  'is.workflow',
  'com.apple.',
  'com.sirikit.',
];

export const testCommand = new Command('test')
  .description('Statically validate a Knowledge Base shortcut JSON file')
  .argument('<file>', 'Path to a .shortcut.json file (output of `shortcut-genius convert`)')
  .option('-v, --verbose', 'Show details for every action')
  .action(async (file: string, options: { verbose?: boolean }) => {
    const absIn = path.resolve(file);
    let raw: string;
    try {
      raw = await fs.readFile(absIn, 'utf8');
    } catch {
      console.error(chalk.red(`File not found: ${absIn}`));
      process.exit(1);
    }

    let data: ShortcutJson;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(chalk.red(`Invalid JSON:`), (err as Error).message);
      process.exit(2);
    }

    const name = data.shortcut_name || path.basename(absIn, '.shortcut.json');
    const actions = data.actions || [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (actions.length === 0) {
      warnings.push('Shortcut has zero actions.');
    }

    const unknownIds = new Set<string>();
    actions.forEach((a, i) => {
      const id = a.WFWorkflowActionIdentifier;
      if (!id || typeof id !== 'string') {
        errors.push(`Action #${i} is missing WFWorkflowActionIdentifier.`);
        return;
      }
      const known = KNOWN_ACTION_PREFIXES.some((p) => id.startsWith(p));
      if (!known) unknownIds.add(id);
      if (options?.verbose) {
        console.log(chalk.gray(`  [${i}] ${id}`));
      }
    });

    if (unknownIds.size > 0) {
      warnings.push(
        `${unknownIds.size} action type(s) not in the iOS Shortcuts namespace — ` +
          `verify they came from a real Shortcuts.app export.`
      );
    }

    // Report.
    const ok = errors.length === 0;
    const tag = ok ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${tag} ${chalk.bold(name)}`);
    console.log(chalk.gray(`  actions:    ${actions.length}`));
    console.log(chalk.gray(`  complexity: ${data.complexity_score ?? 'n/a'}`));
    if (warnings.length) {
      console.log(chalk.yellow(`\nWarnings (${warnings.length}):`));
      warnings.forEach((w) => console.log(`  ! ${w}`));
    }
    if (errors.length) {
      console.log(chalk.red(`\nErrors (${errors.length}):`));
      errors.forEach((e) => console.log(`  ✗ ${e}`));
    }
    if (!ok) process.exit(1);
  });