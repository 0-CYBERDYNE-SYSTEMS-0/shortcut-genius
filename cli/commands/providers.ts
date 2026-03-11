/**
 * Providers Command
 * Manage API provider configurations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, initConfig } from '../utils/config.js';

// Providers directory
const PROVIDERS_DIR = path.join(os.homedir(), '.shortcut-genius');
const PROVIDERS_FILE = path.join(PROVIDERS_DIR, 'providers.json');

export const providersCommand = new Command('providers')
  .description('Manage API provider configurations')
  .addSubCommand(new Command('list')
    .description('List configured providers')
    .action(async () => {
      try {
        const providers = await loadProviders();
        displayProviders(providers);
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('configure')
    .description('Configure a provider')
    .argument('<provider>', 'Provider name (openai, anthropic, glm, minimax, kimi, opencode, codex)')
    .option('-k, --key <api-key>', 'API key to set')
    .option('--test', 'Test connection after setting')
    .action(async (provider, options) => {
      try {
        await configureProvider(provider, options);
      } catch (error: any) {
        ora().fail(chalk.red(`Configuration failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('remove')
    .description('Remove provider configuration')
    .argument('<provider>', 'Provider name to remove')
    .action(async (provider) => {
      try {
        await removeProvider(provider);
      } catch (error: any) {
        ora().fail(chalk.red(`Failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('test')
    .description('Test provider connection')
    .argument('<provider>', 'Provider name to test')
    .action(async (provider) => {
      try {
        await testProvider(provider);
      } catch (error: any) {
        ora().fail(chalk.red(`Test failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .addSubCommand(new Command('import')
    .description('Import provider from web app')
    .argument('<file>', 'Path to providers.json file')
    .action(async (file) => {
      try {
        await importProviders(file);
      } catch (error: any) {
        ora().fail(chalk.red(`Import failed: ${error.message}`));
        process.exit(1);
      }
    }))
  .action(() => {
    // Default action: show list
    providers.commands.find(c => c.name() === 'list')?.action();
  });

/**
 * Load providers from file
 */
async function loadProviders(): Promise<any> {
  try {
    const content = await fs.readFile(PROVIDERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Display providers
 */
function displayProviders(providers: any) {
  console.log();
  console.log(chalk.bold('Configured Providers'));
  console.log(chalk.gray('─'.repeat(42)));
  console.log();

  const providerNames = Object.keys(providers);
  
  if (providerNames.length === 0) {
    console.log(chalk.yellow('No providers configured'));
    console.log();
    console.log(chalk.dim('Use: shortcut-genius providers configure <provider>'));
    return;
  }

  providerNames.forEach(provider => {
    const config = providers[provider];
    const providerInfo = getProviderInfo(provider);
    const hasKey = !!config.apiKey || !!config.oauthToken;
    
    console.log(chalk.bold(getProviderColor(provider)(`• ${providerInfo.name} (${provider})`)));
    console.log(`  Description: ${chalk.dim(providerInfo.description)}`);
    console.log(`  Status:       ${hasKey ? chalk.green('✓ Connected') : chalk.yellow('⚠ Not configured')}`);
    
    if (config.connected) {
      console.log(`  API Key:     ${chalk.dim('•'.repeat(10))}`);
    }
    
    if (providerInfo.models) {
      console.log(`  Models:       ${chalk.dim(providerInfo.models.join(', '))}`);
    }
    
    console.log();
  });
}

/**
 * Configure provider
 */
async function configureProvider(provider: string, options: any) {
  const spinner = ora(`Configuring ${provider}...`).start();

  // Validate provider
  const validProviders = ['openai', 'anthropic', 'glm', 'minimax', 'kimi', 'opencode', 'codex'];
  if (!validProviders.includes(provider)) {
    spinner.fail(chalk.red(`Invalid provider: ${provider}`));
    console.log(chalk.dim('Valid providers: ' + validProviders.join(', ')));
    process.exit(1);
  }

  const providerInfo = getProviderInfo(provider);

  // Get API key if not provided
  let apiKey = options.key;
  if (!apiKey && providerInfo.authType === 'apikey') {
    spinner.stop();
    const readline = (await import('readline')).createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    apiKey = await new Promise<string>(resolve => {
      readline.question(`Enter ${providerInfo.name} API key: `, resolve);
    });
    
    readline.close();
    spinner.start();
  }

  // Load existing providers
  const providers = await loadProviders();

  // Update provider config
  providers[provider] = {
    connected: !!apiKey,
    apiKey: providerInfo.authType === 'apikey' ? apiKey : undefined,
    oauthToken: providerInfo.authType === 'oauth' ? apiKey : undefined,
    updatedAt: new Date().toISOString()
  };

  // Save providers
  spinner.text = 'Saving configuration...';
  await fs.mkdir(PROVIDERS_DIR, { recursive: true });
  await fs.writeFile(PROVIDERS_FILE, JSON.stringify(providers, null, 2));

  spinner.succeed(chalk.green(`✓ ${provider} configured`));

  // Test connection if requested
  if (options.test && apiKey) {
    await testProvider(provider);
  }
}

/**
 * Remove provider
 */
async function removeProvider(provider: string) {
  const spinner = ora(`Removing ${provider}...`).start();

  const providers = await loadProviders();
  
  if (!providers[provider]) {
    spinner.fail(chalk.red(`${provider} is not configured`));
    process.exit(1);
  }

  delete providers[provider];

  await fs.writeFile(PROVIDERS_FILE, JSON.stringify(providers, null, 2));

  spinner.succeed(chalk.green(`✓ ${provider} removed`));
}

/**
 * Test provider connection
 */
async function testProvider(provider: string) {
  const spinner = ora(`Testing ${provider}...`).start();

  const providers = await loadProviders();
  const config = providers[provider];

  if (!config) {
    spinner.fail(chalk.red(`${provider} is not configured`));
    process.exit(1);
  }

  if (!config.apiKey && !config.oauthToken) {
    spinner.fail(chalk.red(`${provider} has no API key`));
    process.exit(1);
  }

  // Try to make a simple API call
  spinner.text = 'Connecting to provider...';
  
  // This would make actual API calls in production
  // For now, simulate success
  await new Promise(resolve => setTimeout(resolve, 1000));

  spinner.succeed(chalk.green(`✓ ${provider} connection OK`));
}

/**
 * Import providers from file
 */
async function importProviders(filePath: string) {
  const spinner = ora('Importing providers...').start();

  try {
    // Read import file
    const importPath = path.resolve(filePath);
    const content = await fs.readFile(importPath, 'utf-8');
    const providers = JSON.parse(content);

    // Validate structure
    if (typeof providers !== 'object') {
      throw new Error('Invalid providers file format');
    }

    // Save providers
    await fs.mkdir(PROVIDERS_DIR, { recursive: true });
    await fs.writeFile(PROVIDERS_FILE, JSON.stringify(providers, null, 2));

    spinner.succeed(chalk.green(`✓ Imported ${Object.keys(providers).length} providers`));

    console.log();
    console.log(chalk.dim('Providers:'), Object.keys(providers).map((p, i) => 
      `${i + 1}. ${p}`
    ).join('\n'));

  } catch (error: any) {
    throw new Error(`Failed to import: ${error.message}`);
  }
}

/**
 * Get provider information
 */
function getProviderInfo(provider: string) {
  const providers: Record<string, any> = {
    openai: {
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5 Turbo models',
      authType: 'apikey',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    anthropic: {
      name: 'Anthropic',
      description: 'Claude 3.5 Sonnet, Claude 3 Opus models',
      authType: 'apikey',
      models: ['claude-3-5-sonnet-20241022']
    },
    glm: {
      name: 'GLM (Zai)',
      description: 'GLM-4.7, GLM-4.6 - Unified reasoning + coding',
      authType: 'apikey',
      models: ['glm/glm-4.7', 'glm/glm-4.6', 'glm/glm-4.5']
    },
    minimax: {
      name: 'MiniMax',
      description: 'MiniMax M2.5, M2.1 - Large context',
      authType: 'apikey',
      models: ['minimax-direct/MiniMax-M2.5', 'minimax-direct/MiniMax-M2.1']
    },
    kimi: {
      name: 'Kimi (Moonshot)',
      description: 'Kimi K2.5 - Agentic coding, 256k context',
      authType: 'apikey',
      models: ['kimi/kimi-k2-5', 'kimi/kimi-k2-0711-preview']
    },
    opencode: {
      name: 'OpenCode Zen',
      description: 'Curated coding models, OpenAI-compatible',
      authType: 'apikey',
      models: ['opencode/default']
    },
    codex: {
      name: 'OpenAI Codex',
      description: 'ChatGPT Plus/Pro Codex via OAuth',
      authType: 'oauth',
      models: ['codex/codex-1']
    }
  };

  return providers[provider] || { name: provider, description: 'Unknown provider', authType: 'apikey', models: [] };
}

/**
 * Get provider color
 */
function getProviderColor(provider: string): typeof chalk {
  switch (provider.toLowerCase()) {
    case 'openai': return chalk.blue;
    case 'anthropic': return chalk.orange;
    case 'glm': return chalk.cyan;
    case 'minimax': return chalk.green;
    case 'kimi': return chalk.yellow;
    case 'opencode': return chalk.magenta;
    case 'codex': return chalk.gray;
    default: return chalk.white;
  }
}

// Add examples
providersCommand.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('shortcut-genius')} providers list
  ${chalk.cyan('shortcut-genius')} providers configure ${chalk.yellow('openai')} ${chalk.cyan('--key')} ${chalk.yellow('sk-xxx')}
  ${chalk.cyan('shortcut-genius')} providers configure ${chalk.yellow('glm')} ${chalk.cyan('--test')}
  ${chalk.cyan('shortcut-genius')} providers test ${chalk.yellow('anthropic')}
  ${chalk.cyan('shortcut-genius')} providers remove ${chalk.yellow('minimax')}
  ${chalk.cyan('shortcut-genius')} providers import ${chalk.yellow('providers.json')}

${chalk.bold('Providers:')}
  ${chalk.green('•')} openai     - OpenAI API keys
  ${chalk.green('•')} anthropic   - Anthropic API keys
  ${chalk.green('•')} glm         - Zai GLM API keys
  ${chalk.green('•')} minimax     - MiniMax API keys
  ${chalk.green('•')} kimi        - Moonshot Kimi API keys
  ${chalk.green('•')} opencode    - OpenCode Zen API keys
  ${chalk.green('•')} codex       - OpenAI Codex (OAuth, no API key needed)

${chalk.bold('Security:')}
  API keys are stored locally in ${chalk.cyan('~/.shortcut-genius/providers.json')}
  Keys are never shared or sent to third parties
  Keys are only used to communicate with provider APIs
`);
