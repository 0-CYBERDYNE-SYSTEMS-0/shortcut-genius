/**
 * Configuration Utilities
 * Load and manage CLI configuration
 */

import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import dotenv from 'dotenv';

// Config directory path
const CONFIG_DIR = path.join(os.homedir(), '.shortcut-genius');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const ENV_FILE = path.join(CONFIG_DIR, '.env');

/**
 * Load CLI configuration
 */
export async function loadConfig(): Promise<{
  defaultModel?: string;
  defaultProvider?: string;
  outputFormat?: 'json' | 'plist' | 'shortcut';
  signByDefault?: boolean;
  apiKey?: string;
}> {
  try {
    // Load environment variables
    dotenv.config({ path: ENV_FILE });

    // Load config file
    const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configContent);

    return {
      defaultModel: config.defaultModel || 'gpt-4o',
      defaultProvider: config.defaultProvider,
      outputFormat: config.outputFormat || 'shortcut',
      signByDefault: config.signByDefault !== false,
      apiKey: process.env.OPENAI_API_KEY
    };
  } catch {
    // Return defaults if config doesn't exist
    return {
      defaultModel: 'gpt-4o',
      outputFormat: 'shortcut',
      signByDefault: true
    };
  }
}

/**
 * Save CLI configuration
 */
export async function saveConfig(config: any): Promise<void> {
  try {
    // Ensure config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Save config file
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error: any) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

/**
 * Get config value
 */
export async function getConfigValue(key: string): Promise<any> {
  const config = await loadConfig();
  return config[key];
}

/**
 * Set config value
 */
export async function setConfigValue(key: string, value: any): Promise<void> {
  const config = await loadConfig();
  config[key] = value;
  await saveConfig(config);
}

/**
 * List all config values
 */
export async function listConfig(): Promise<void> {
  const config = await loadConfig();
  
  console.log('CLI Configuration:');
  console.log('─'.repeat(42));
  Object.entries(config).forEach(([key, value]) => {
    if (key === 'apiKey') {
      // Hide API key
      console.log(`  ${key}: ${'•'.repeat(10)}`);
    } else if (value === undefined || value === null) {
      console.log(`  ${key}: ${chalk.dim('(not set)')}`);
    } else {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    }
  });
}

/**
 * Initialize config directory
 */
export async function initConfig(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    
    // Create .env file if it doesn't exist
    try {
      await fs.access(ENV_FILE);
    } catch {
      const envContent = `# ShortcutGenius CLI Configuration
# Add your API keys here

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

# Default model
DEFAULT_MODEL=gpt-4o

# Server URL (if not localhost:4321)
SHORTCUT_GENIUS_API=http://localhost:4321
`;
      await fs.writeFile(ENV_FILE, envContent);
    }

    // Create config file if it doesn't exist
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      const defaultConfig = {
        defaultModel: 'gpt-4o',
        outputFormat: 'shortcut',
        signByDefault: true
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    }

    return true;
  } catch (error: any) {
    throw new Error(`Failed to initialize config: ${error.message}`);
  }
}
