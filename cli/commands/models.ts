/**
 * Models Command
 * List available AI models
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { listModels } from '../api/client.js';

export const modelsCommand = new Command('models')
  .description('List available AI models')
  .option('-p, --provider <name>', 'Filter by provider')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Fetching models...').start();

      // Fetch models from API
      const result = await listModels({
        provider: options.provider
      });

      if (!result.success) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        process.exit(1);
      }

      spinner.succeed(chalk.green('✓ Models fetched'));

      // Display models
      if (options.json) {
        console.log(JSON.stringify(result.models, null, 2));
      } else {
        displayModels(result.models);
      }

    } catch (error: any) {
      ora().fail(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Display models in formatted table
function displayModels(models: any[]) {
  if (!models || models.length === 0) {
    console.log(chalk.yellow('No models available'));
    return;
  }

  console.log();
  console.log(chalk.bold('Available AI Models'));
  console.log(chalk.gray('─'.repeat(72)));
  console.log();

  // Group by provider
  const grouped = models.reduce((acc, model) => {
    const provider = model.provider || 'unknown';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {});

  // Display each provider's models
  Object.entries(grouped).forEach(([provider, providerModels]) => {
    const providerColor = getProviderColor(provider);
    
    console.log(chalk.bold(providerColor(`┌─ ${provider.toUpperCase()} ─${'─'.repeat(66 - provider.length)}`)));
    console.log(chalk.bold(providerColor(`│`)));
    
    providerModels.forEach(model => {
      const name = model.name || model.id;
      const category = model.category || 'balanced';
      const categoryColor = getCategoryColor(category);
      
      // Format model info
      const modelId = chalk.dim(model.id || model.name);
      const modelName = chalk.bold.white(name);
      const modelCategory = categoryColor(category);
      
      // Output
      console.log(`│  ${modelId.padEnd(35)} ${modelName.padEnd(25)} ${modelCategory}`);
      
      // Show additional info
      if (model.capabilities?.maxTokens) {
        console.log(`│    ${chalk.dim(`Max tokens: ${model.capabilities.maxTokens.toLocaleString()}`)}`);
      }
      if (model.capabilities?.contextWindow) {
        console.log(`│    ${chalk.dim(`Context: ${model.capabilities.contextWindow.toLocaleString()}`)}`);
      }
    });

    console.log(chalk.bold(providerColor(`└${'─'.repeat(71)}`)));
    console.log();
  });

  console.log(chalk.dim('Use --provider flag to filter by provider'));
}

// Get provider color
function getProviderColor(provider: string): typeof chalk {
  switch (provider.toLowerCase()) {
    case 'openai': return chalk.blue;
    case 'anthropic': return chalk.orange;
    case 'openrouter': return chalk.purple;
    case 'glm': return chalk.cyan;
    case 'minimax': return chalk.green;
    case 'kimi': return chalk.yellow;
    case 'opencode': return chalk.magenta;
    case 'codex': return chalk.gray;
    default: return chalk.white;
  }
}

// Get category color
function getCategoryColor(category: string): typeof chalk {
  switch (category.toLowerCase()) {
    case 'fast': return chalk.green;
    case 'balanced': return chalk.blue;
    case 'reasoning': return chalk.purple;
    case 'coding': return chalk.cyan;
    default: return chalk.gray;
  }
}

// Add examples
modelsCommand.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('shortcut-genius')} models
  ${chalk.cyan('shortcut-genius')} models ${chalk.cyan('--provider')} ${chalk.yellow('openai')}
  ${chalk.cyan('shortcut-genius')} models ${chalk.cyan('--json')} ${chalk.cyan('>')} ${chalk.yellow('models.json')}

${chalk.bold('Providers:')}
  ${chalk.green('•')} openai    - OpenAI models (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
  ${chalk.green('•')} anthropic  - Anthropic models (claude-3-5-sonnet, claude-3-opus, etc.)
  ${chalk.green('•')} openrouter - Any OpenRouter model (deepseek, llama, mistral, etc.)
  ${chalk.green('•')} glm        - Zai GLM models (glm-4.7, glm-4.6, glm-4.5)
  ${chalk.green('•')} minimax    - MiniMax models (MiniMax-M2.5, MiniMax-M2.1, etc.)
  ${chalk.green('•')} kimi       - Moonshot Kimi models (kimi-k2-5, kimi-k2-0711-preview)
  ${chalk.green('•')} opencode   - OpenCode Zen models (opencode-default)
  ${chalk.green('•')} codex      - OpenAI Codex models (codex-1)

${chalk.bold('Model IDs:')}
  Use the full model ID when building shortcuts:
  ${chalk.cyan('--model')} ${chalk.yellow('gpt-4o')}
  ${chalk.cyan('--model')} ${chalk.yellow('claude-3-5-sonnet-20241022')}
  ${chalk.cyan('--model')} ${chalk.yellow('glm/glm-4.7')}
  ${chalk.cyan('--model')} ${chalk.yellow('minimax-direct/MiniMax-M2.5')}
  ${chalk.cyan('--model')} ${chalk.yellow('openrouter/deepseek/deepseek-chat')}
`);
