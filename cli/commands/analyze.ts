/**
 * Analyze Command
 * Analyze existing iOS shortcut
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { analyzeShortcut } from '../api/client.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze existing iOS shortcut')
  .argument('<file>', 'Shortcut file to analyze (.json, .plist, .shortcut)')
  .option('-m, --model <name>', 'AI model to use for analysis')
  .option('-d, --detailed', 'Show detailed analysis')
  .option('-j, --json', 'Output as JSON')
  .option('-w, --warnings-only', 'Only show warnings')
  .option('--fix', 'Suggest fixes for issues')
  .action(async (file, options) => {
    try {
      const spinner = ora('Analyzing shortcut...').start();

      // Check if file exists
      const filePath = path.resolve(file);
      try {
        await fs.access(filePath);
      } catch {
        spinner.fail(chalk.red(`File not found: ${chalk.cyan(filePath)}`));
        process.exit(1);
      }

      // Read file
      spinner.text = 'Reading shortcut file...';
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Parse as JSON
      let shortcut;
      try {
        shortcut = JSON.parse(fileContent);
      } catch {
        // Try to convert from plist/shortcut format
        spinner.text = 'Converting to JSON...';
        shortcut = await convertToJSON(fileContent);
      }

      if (!shortcut || !shortcut.name) {
        spinner.fail(chalk.red('Invalid shortcut file format'));
        process.exit(1);
      }

      // Analyze
      spinner.text = `Analyzing with AI${options.model ? ` (${chalk.cyan(options.model)})` : ''}...`;
      const analysis = await analyzeShortcut({
        shortcut,
        model: options.model,
        detailed: options.detailed,
        suggestFixes: options.fix
      });

      if (analysis.error) {
        spinner.fail(chalk.red(`Analysis failed: ${analysis.error}`));
        process.exit(1);
      }

      spinner.succeed(chalk.green('✓ Analysis complete'));

      // Output results
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        displayAnalysis(analysis, shortcut, options);
      }

    } catch (error: any) {
      ora().fail(chalk.red(`Analysis failed: ${error.message}`));
      process.exit(1);
    }
  });

// Display analysis results
function displayAnalysis(analysis: any, shortcut: any, options: any) {
  console.log();
  console.log(chalk.bold('Shortcut Analysis'));
  console.log(chalk.gray('─'.repeat(42)));
  console.log();

  // Basic info
  console.log(chalk.bold('Basic Information:'));
  console.log(`  Name:     ${chalk.cyan(shortcut.name)}`);
  console.log(`  Actions:  ${chalk.yellow(String(shortcut.actions?.length || 0))}`);
  if (shortcut.icon) {
    console.log(`  Icon:     ${chalk.gray('✓')}`);
  }
  console.log();

  // Compatibility
  if (analysis.compatibility) {
    console.log(chalk.bold('iOS Compatibility:'));
    const { iOS, issues, score } = analysis.compatibility;
    console.log(`  Version:   ${chalk.cyan(iOS)}`);
    console.log(`  Score:     ${score >= 80 ? chalk.green(String(score)) : score >= 50 ? chalk.yellow(String(score)) : chalk.red(String(score))}`);
    console.log();

    if (issues && issues.length > 0) {
      console.log(chalk.bold('Issues:'));
      issues.forEach((issue: string, i: number) => {
        const severity = issue.match(/\[([^\]]+)\]/)?.[1];
        const message = issue.replace(/\[([^\]]+)\]\s*/, '');
        
        if (options.warningsOnly && !severity) {
          return;
        }

        let icon = '⚠️';
        if (severity?.includes('Error')) icon = '❌';
        if (severity?.includes('Warning')) icon = '⚠️';
        if (severity?.includes('Info')) icon = 'ℹ️';

        console.log(`  ${icon} ${message}`);
        if (issue.suggestion && !options.warningsOnly) {
          console.log(`    ${chalk.dim.green('→')} ${issue.suggestion}`);
        }
      });
      console.log();
    }
  }

  // Optimizations
  if (analysis.optimizations && analysis.optimizations.length > 0) {
    if (!options.warningsOnly) {
      console.log(chalk.bold('Optimizations:'));
      analysis.optimizations.forEach((opt: any, i: number) => {
        console.log(`  ${i + 1}. ${chalk.green(opt.type)}`);
        console.log(`     ${chalk.dim(opt.description)}`);
        if (opt.impact) {
          const impact = opt.impact.toLowerCase();
          const color = impact === 'high' ? chalk.red : impact === 'medium' ? chalk.yellow : chalk.gray;
          console.log(`     Impact: ${color(opt.impact)}`);
        }
        if (opt.suggestion) {
          console.log(`     ${chalk.dim.cyan('→')} ${opt.suggestion}`);
        }
        console.log();
      });
    }
  }

  // Security
  if (analysis.security && !options.warningsOnly) {
    console.log(chalk.bold('Security Check:'));
    const checks = analysis.security;
    Object.entries(checks).forEach(([key, value]: [string, any]) => {
      const status = value.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${key}`);
      if (value.message) {
        console.log(`     ${chalk.dim(value.message)}`);
      }
      if (value.mitigation) {
        console.log(`     ${chalk.dim.yellow('→')} ${value.mitigation}`);
      }
    });
    console.log();
  }

  // Summary
  console.log(chalk.bold('Summary:'));
  const issues = analysis.compatibility?.issues?.length || 0;
  const optimizations = analysis.optimizations?.length || 0;
  const securityPasses = Object.values(analysis.security || {}).filter((v: any) => v.passed).length || 0;
  const securityTotal = Object.keys(analysis.security || {}).length || 0;

  console.log(`  Issues:        ${issues > 0 ? chalk.red(String(issues)) : chalk.green('None')}`);
  console.log(`  Optimizations: ${optimizations > 0 ? chalk.yellow(String(optimizations)) : chalk.gray('None')}`);
  console.log(`  Security:       ${securityPasses}/${securityTotal} ${securityPasses === securityTotal ? chalk.green('✓') : chalk.red('⚠')}`);
}

// Convert plist/shortcut to JSON (placeholder)
async function convertToJSON(content: string): Promise<any> {
  // This would use the proper plist parser in production
  // For now, assume it's already JSON or will be handled by API
  try {
    // Try parsing as-is
    return JSON.parse(content);
  } catch {
    // If that fails, return a basic structure
    return {
      name: 'Unknown Shortcut',
      actions: []
    };
  }
}

// Add examples
analyzeCommand.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('shortcut-genius')} analyze ${chalk.yellow('my-shortcut.shortcut')}
  ${chalk.cyan('shortcut-genius')} analyze ${chalk.yellow('shortcut.json')} ${chalk.cyan('--detailed')}
  ${chalk.cyan('shortcut-genius')} analyze ${chalk.yellow('shortcut.plist')} ${chalk.cyan('--warnings-only')}
  ${chalk.cyan('shortcut-genius')} analyze ${chalk.yellow('shortcut.json')} ${chalk.cyan('--json')} ${chalk.cyan('>')} ${chalk.yellow('analysis.json')}

${chalk.bold('Output:')}
  By default, analysis shows formatted text.
  Use ${chalk.cyan('--json')} to get machine-readable JSON output.
  Use ${chalk.cyan('--warnings-only')} to only see issues.
  Use ${chalk.cyan('--fix')} to get AI-suggested fixes.

${chalk.bold('What Gets Analyzed:')}
  ${chalk.green('•')} iOS compatibility issues
  ${chalk.green('•')} Action patterns and dependencies
  ${chalk.green('•')} Performance optimization opportunities
  ${chalk.green('•')} Security vulnerabilities
  ${chalk.green('•')} Best practices violations`);
