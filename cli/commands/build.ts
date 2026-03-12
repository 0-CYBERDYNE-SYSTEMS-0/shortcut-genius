/**
 * Build Command
 * Build iOS shortcut from text prompt using AI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { buildShortcut } from '../api/client.js';
import { loadConfig } from '../utils/config.js';

export const buildCommand = new Command('build')
  .description('Build iOS shortcut from text prompt using AI')
  .argument('<prompt>', 'Description of shortcut to build')
  .option('-m, --model <name>', 'AI model to use (default: from config or gpt-4o)')
  .option('-p, --provider <name>', 'AI provider (openai, anthropic, glm, minimax, kimi, opencode, codex)')
  .option('-o, --output <path>', 'Output file path (default: <name>.shortcut)')
  .option('-f, --format <type>', 'Format: json, plist, shortcut (default: shortcut)')
  .option('--sign', 'Sign shortcut file')
  .option('--no-sign', "Don't sign shortcut")
  .option('--debug', 'Show debug information')
  .action(async (prompt, options) => {
    try {
      const spinner = ora('Building shortcut...').start();

      // Load configuration
      const config = await loadConfig();

      // Determine model
      const model = options.model || config.defaultModel || 'gpt-4o';

      // Determine output path
      const shortcutName = prompt.split(' ').slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
      const defaultOutput = `${shortcutName || 'shortcut'}.${options.format || 'shortcut'}`;
      const outputPath = path.resolve(options.output || defaultOutput);

      spinner.text = `Generating with ${chalk.cyan(model)}...`;

      // Build shortcut via API
      const result = await buildShortcut({
        prompt,
        model,
        provider: options.provider,
        format: options.format,
        sign: options.sign !== false,
        debug: options.debug
      });

      if (result.error) {
        spinner.fail(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }

      // Write to file
      spinner.text = `Writing to ${chalk.cyan(outputPath)}...`;
      await fs.writeFile(outputPath, result.content);

      spinner.succeed(chalk.green(`✓ Shortcut saved to ${chalk.cyan(outputPath)}`));

      // Show stats
      if (result.shortcut) {
        console.log();
        console.log(chalk.bold('Shortcut Statistics:'));
        console.log(`  Name:     ${chalk.cyan(result.shortcut.name)}`);
        console.log(`  Actions:  ${chalk.yellow(String(result.shortcut.actions?.length || 0))}`);
        if (result.shortcut.icon) {
          console.log(`  Icon:     ${chalk.gray('✓')}`);
        }
        if (result.shortcut.color) {
          console.log(`  Color:    ${chalk.gray('#' + result.shortcut.color)}`);
        }
      }

      // Show usage info
      console.log();
      console.log(chalk.dim('Next steps:'));
      console.log(`  1. ${chalk.cyan(`open "${outputPath}"`)} to install`);
      console.log(`  2. Use ${chalk.cyan('shortcut-genius test')} to run tests`);

    } catch (error: any) {
      ora().fail(chalk.red(`Build failed: ${error.message}`));
      if (error.debug) {
        console.log(chalk.dim(error.debug));
      }
      process.exit(1);
    }
  });

// Add examples
buildCommand.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('shortcut-genius')} build ${chalk.yellow('"Create a timer shortcut"')}
  ${chalk.cyan('shortcut-genius')} build ${chalk.yellow('"Weather widget with alerts"')} ${chalk.cyan('--model')} ${chalk.yellow('gpt-4o')}
  ${chalk.cyan('shortcut-genius')} build ${chalk.yellow('"Task automation"')} ${chalk.cyan('--provider')} ${chalk.yellow('anthropic')} ${chalk.cyan('--format')} ${chalk.yellow('plist')}

${chalk.bold('Models:')}
  Use ${chalk.cyan('--model')} to specify any model:
  ${chalk.green('•')} gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
  ${chalk.green('•')} claude-3-5-sonnet-20241022
  ${chalk.green('•')} glm/glm-4.7, glm/glm-4.6 (Zai)
  ${chalk.green('•')} minimax-direct/MiniMax-M2.5, minimax-direct/MiniMax-M2.1
  ${chalk.green('•')} kimi/kimi-k2-5, kimi/kimi-k2-0711-preview
  ${chalk.green('•')} opencode/default
  ${chalk.green('•')} Any OpenRouter model (provider/model)

${chalk.bold('Providers:')}
  Use ${chalk.cyan('--provider')} or prefix model with provider/:
  ${chalk.green('•')} openai     - OpenAI models (gpt-4o, etc.)
  ${chalk.green('•')} anthropic   - Anthropic models (claude-3-5-sonnet, etc.)
  ${chalk.green('•')} glm         - Zai GLM models (glm/glm-4.7)
  ${chalk.green('•')} minimax     - MiniMax models (minimax-direct/MiniMax-M2.5)
  ${chalk.green('•')} kimi        - Moonshot Kimi models (kimi/kimi-k2-5)
  ${chalk.green('•')} opencode    - OpenCode Zen models
  ${chalk.green('•')} codex       - OpenAI Codex (OAuth required)
`);
