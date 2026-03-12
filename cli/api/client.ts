/**
 * API Client
 * Communicates with ShortcutGenius server for CLI operations
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Server configuration
const API_BASE = process.env.SHORTCUT_GENIUS_API || 'http://localhost:4321';
const API_TIMEOUT = 120000; // 2 minutes for AI responses

/**
 * Build shortcut from prompt
 */
export async function buildShortcut(options: {
  prompt: string;
  model?: string;
  provider?: string;
  format?: 'json' | 'plist' | 'shortcut';
  sign?: boolean;
  debug?: boolean;
}): Promise<{
  success: boolean;
  content?: string;
  shortcut?: any;
  error?: string;
  debug?: any;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        prompt: options.prompt,
        type: 'generate',
        reasoningOptions: {
          reasoning_effort: 'medium',
          verbosity: options.debug ? 'verbose' : 'medium'
        }
      }),
      signal: AbortSignal.timeout(API_TIMEOUT)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.details || 'API request failed'
      };
    }

    // Parse AI response to get shortcut
    let shortcut;
    try {
      shortcut = JSON.parse(data.content);
    } catch {
      // If content is not JSON, create a basic structure
      shortcut = {
        name: options.prompt.split(' ').slice(0, 3).join(' ') || 'Untitled Shortcut',
        actions: []
      };
    }

    // Build shortcut file based on format
    let content;
    if (options.format === 'json') {
      content = JSON.stringify(shortcut, null, 2);
    } else if (options.format === 'plist' || options.format === 'shortcut') {
      // Would use plist conversion library here
      // For now, return as JSON
      content = JSON.stringify(shortcut, null, 2);
    }

    return {
      success: true,
      content,
      shortcut
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Analyze shortcut
 */
export async function analyzeShortcut(options: {
  shortcut: any;
  model?: string;
  detailed?: boolean;
  suggestFixes?: boolean;
}): Promise<{
  success: boolean;
  analysis?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        prompt: JSON.stringify(options.shortcut),
        type: 'analyze',
        reasoningOptions: {
          reasoning_effort: 'medium',
          verbosity: options.detailed ? 'verbose' : 'medium'
        }
      }),
      signal: AbortSignal.timeout(API_TIMEOUT)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.details || 'API request failed'
      };
    }

    // Parse analysis
    let analysis;
    try {
      analysis = JSON.parse(data.content);
    } catch {
      analysis = {
        compatibility: { iOS: 'Unknown', issues: [], score: 0 },
        optimizations: [],
        security: {}
      };
    }

    return {
      success: true,
      analysis
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Convert shortcut format
 */
export async function convertShortcut(options: {
  input: string;
  format: 'json' | 'plist' | 'shortcut';
}): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/shortcuts/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shortcut: options.input,
        format: options.format
      }),
      signal: AbortSignal.timeout(API_TIMEOUT)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.details || 'Conversion failed'
      };
    }

    return {
      success: true,
      content: data.output || data.content
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Test shortcut (macOS automation bridge)
 */
export async function testShortcut(options: {
  file: string;
  verbose?: boolean;
}): Promise<{
  success: boolean;
  results?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/shortcuts/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: options.file,
        verbose: options.verbose
      }),
      signal: AbortSignal.timeout(API_TIMEOUT)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.details || 'Test failed'
      };
    }

    return {
      success: true,
      results: data
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * List available models
 */
export async function listModels(options?: {
  provider?: string;
}): Promise<{
  success: boolean;
  models?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to fetch models'
      };
    }

    let models = data.models || [];

    // Filter by provider if specified
    if (options?.provider) {
      models = models.filter((m: any) => 
        m.provider === options.provider || 
        m.id.startsWith(options.provider + '/')
      );
    }

    return {
      success: true,
      models
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Check server health
 */
export async function checkServer(): Promise<{
  running: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return { running: false, error: 'Server returned error' };
    }

    const data = await response.json();
    return {
      running: true,
      version: data.version || '1.0.0'
    };

  } catch (error: any) {
    return {
      running: false,
      error: error.message || 'Server not running'
    };
  }
}
