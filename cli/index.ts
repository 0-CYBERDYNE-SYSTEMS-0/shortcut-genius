#!/usr/bin/env node
/**
 * ShortcutGenius CLI
 * Command-line interface for iOS shortcut creation, analysis, and testing
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Import CLI commands
import { buildCommand } from './commands/build.js';
import { analyzeCommand } from './commands/analyze.js';
import { convertCommand } from './commands/convert.js';
import { testCommand } from './commands/test.js';
import { modelsCommand } from './commands/models.js';
import { providersCommand } from './commands/providers.js';
import { configCommand } from './commands/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI Version
const VERSION = '1.0.0';

// Main CLI program
const program = new Command();

program
  .name('shortcut-genius')
  .description('AI-powered iOS shortcut builder, analyzer, and tester')
  .version(VERSION);

// Add subcommands
program.addCommand(buildCommand);
program.addCommand(analyzeCommand);
program.addCommand(convertCommand);
program.addCommand(testCommand);
program.addCommand(modelsCommand);
program.addCommand(providersCommand);
program.addCommand(configCommand);

// Default command (show help)
program.action(() => {
  console.log(`
${chalk.bold.cyan('╔════════════════════════════════════════╗')}
${chalk.bold.cyan('║')}  ${chalk.bold.white('ShortcutGenius CLI')} v${VERSION}
${chalk.bold.cyan('║')}  ${chalk.white('AI-Powered iOS Shortcut Builder')}
${chalk.bold.cyan('╠════════════════════════════════════════╣')}

${chalk.bold.yellow('Common Commands:')}
  ${chalk.green('build')}    Build shortcut from text prompt
  ${chalk.green('analyze')}  Analyze existing shortcut
  ${chalk.green('convert')}  Convert shortcut format
  ${chalk.green('test')}     Test shortcut on macOS

${chalk.bold.yellow('Information:')}
  ${chalk.green('models')}   List available AI models
  ${chalk.green('providers')} Manage API providers
  ${chalk.green('config')}   View or edit configuration

${chalk.bold.yellow('Examples:')}
  ${chalk.gray('# Build a shortcut')}
  ${chalk.cyan('shortcut-genius')} build ${chalk.yellow('"Create a timer shortcut"')}

  ${chalk.gray('# Analyze shortcut')}
  ${chalk.cyan('shortcut-genius')} analyze ${chalk.yellow('my-shortcut.shortcut')}

  ${chalk.gray('# Convert format')}
  ${chalk.cyan('shortcut-genius')} convert ${chalk.yellow('input.json')} ${chalk.cyan('--to')} ${chalk.yellow('plist')}

  ${chalk.gray('# Test shortcut (macOS)')}
  ${chalk.cyan('shortcut-genius')} test ${chalk.yellow('my-shortcut.shortcut')}

${chalk.bold.gray('─'.repeat(42))}
${chalk.gray('Use:')} ${chalk.cyan('shortcut-genius <command> --help')} ${chalk.gray('for details')}
  `);
});

// Parse command line arguments
program.parse();

// Export for testing
export { program };
