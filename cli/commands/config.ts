/**
 * Config Command
 * View and edit CLI configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, saveConfig, initConfig, getConfigValue, setConfigValue, listConfig } from '../utils/config.js';

export const configCommand = new Command('config')
  .description('View or edit CLI configuration')
  .addSubCommand(new Command('get')
    .description('Get configuration value')
    .argument('<key>', 'Configuration key')
    .action(async (key) => {
      try {
        const value = await getConfigValue(key);
        if (value === undefined || value === null) {
          console.log(chalk.yellow(`Configuration key '${key}' not set`));
        } else if (key === 'apiKey') {
          // Hide API key
          console.log(chalk.green(`${key}: ${'•'.repeat(10)}`));
        } else {
          console.log(chalk.green(`${key}: ${JSON.stringify(value)}`));
        }
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('set')
    .description('Set configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action(async (key, value) => {
      try {
        const spinner = ora(`Setting ${key}...`).start();
        
        // Parse value if it's JSON or boolean
        let parsedValue;
        if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (value.startsWith('{') || value.startsWith('[')) {
          parsedValue = JSON.parse(value);
        } else {
          parsedValue = value;
        }

        await setConfigValue(key, parsedValue);
        
        spinner.succeed(chalk.green(`✓ ${key} set to ${JSON.stringify(parsedValue)}`));
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('list')
    .description('List all configuration')
    .action(async () => {
      try {
        await listConfig();
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Force reset without confirmation')
    .action(async (options) => {
      try {
        await resetConfig(options.force);
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('init')
    .description('Initialize configuration')
    .action(async () => {
      try {
        const spinner = ora('Initializing configuration...').start();
        await initConfig();
        spinner.succeed(chalk.green('✓ Configuration initialized'));
        console.log();
        console.log(chalk.dim('Configuration files created in ~/.shortcut-genius/'));
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .action(() => {
    // Default action: show list
    configCommand.commands.find(c => c.name() === 'list')?.action();
  });

/**
 * Reset configuration to defaults
 */
async function resetConfig(force: boolean = false): Promise<void> {
  if (!force) {
    const readline = (await import('readline')).createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>(resolve => {
      readline.question(
        chalk.yellow('Are you sure you want to reset all configuration? (y/N): '),
        resolve
      );
    });

    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.dim('Reset cancelled'));
      return;
    }
  }

  const spinner = ora('Resetting configuration...').start();
  
  const defaultConfig = {
    defaultModel: 'gpt-4o',
    outputFormat: 'shortcut',
    signByDefault: true
  };

  await saveConfig(defaultConfig);
  
  spinner.succeed(chalk.green('✓ Configuration reset to defaults'));
}

// Add examples
configCommand.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('shortcut-genius')} config list
  ${chalk.cyan('shortcut-genius')} config get ${chalk.yellow('defaultModel')}
  ${chalk.cyan('shortcut-genius')} config set ${chalk.yellow('defaultModel')} ${chalk.yellow('gpt-4o')}
  ${chalk.cyan('shortcut-genius')} config set ${chalk.yellow('signByDefault')} ${chalk.yellow('true')}
  ${chalk.cyan('shortcut-genius')} config reset
  ${chalk.cyan('shortcut-genius')} config init

${chalk.bold('Configuration Keys:')}
  ${chalk.green('•')} ${chalk.cyan('defaultModel')}       - Default AI model (e.g., gpt-4o, claude-3-5-sonnet-20241022)
  ${chalk.green('•')} ${chalk.cyan('defaultProvider')}    - Default AI provider (e.g., openai, anthropic)
  ${chalk.green('•')} ${chalk.cyan('outputFormat')}      - Default output format (json, plist, shortcut)
  ${chalk.green('•')} ${chalk.cyan('signByDefault')}    - Sign shortcuts by default (true, false)
  ${chalk.green('•')} ${chalk.cyan('apiKey')}           - OpenAI API key (read-only, use providers command)

${chalk.bold('Configuration Files:')}
  ${chalk.dim('Config:')} ~/.shortcut-genius/config.json
  ${chalk.dim('Env:')}    ~/.shortcut-genius/.env

${chalk.bold('Values:')}
  Booleans: ${chalk.cyan('true')} or ${chalk.cyan('false')}
  Strings:  Wrap in quotes if containing spaces
  JSON:    Valid JSON objects or arrays

${chalk.bold('Environment Variables:')}
  You can also set these in ~/.shortcut-genius/.env:
  ${chalk.dim('OPENAI_API_KEY=sk-xxx')}
  ${chalk.dim('ANTHROPIC_API_KEY=sk-ant-xxx')}
  ${chalk.dim('DEFAULT_MODEL=gpt-4o')}
`);
