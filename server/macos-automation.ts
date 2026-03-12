import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface ImportResult {
  success: boolean;
  shortcutName?: string;
  error?: string;
}

export interface RunResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Check if macOS Shortcuts automation is available
 */
export async function checkAutomationCapability(): Promise<{
  available: boolean;
  reason?: string;
  needsPermissions?: boolean;
}> {
  try {
    if (process.platform !== 'darwin') {
      return {
        available: false,
        reason: 'Shortcut automation is only available on macOS'
      };
    }

    // Check if shortcuts command is available
    await execAsync('which shortcuts');

    // Test if shortcuts command works
    await execAsync('shortcuts list | head -1');

    return { available: true };
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    
    if (errorStr.includes('not found')) {
      return {
        available: false,
        reason: 'shortcuts command not found. Ensure Shortcuts.app is installed on macOS.'
      };
    }
    
    if (errorStr.includes('not permitted')) {
      return {
        available: false,
        reason: 'Automation permission denied. Grant Terminal/IDE access to Shortcuts in System Settings → Privacy & Security.',
        needsPermissions: true
      };
    }

    return {
      available: false,
      reason: `Automation check failed: ${errorStr}`
    };
  }
}

/**
 * Import a shortcut file into macOS Shortcuts app
 */
export async function importShortcut(
  shortcutFilePath: string
): Promise<ImportResult> {
  try {
    const capability = await checkAutomationCapability();
    if (!capability.available) {
      return {
        success: false,
        error: capability.reason
      };
    }

    // Generate a unique name to avoid conflicts
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const originalName = path.basename(shortcutFilePath, '.shortcut');
    const uniqueName = `SG_TEST_${originalName}_${uniqueSuffix}`;

    // Use AppleScript to import the shortcut
    const appleScript = `
tell application "Shortcuts"
  set shortcutFile to (POSIX file "${shortcutFilePath.replace(/"/g, '\\"')}")
  try
    set newShortcut to import shortcutFile
    set name of newShortcut to "${uniqueName}"
    return "${uniqueName}"
  on error errMsg
    return "ERROR: " & errMsg
  end try
end tell
`.trim();

    const { stdout, stderr } = await execAsync(`osascript -e '${appleScript}'`);

    if (stdout.startsWith('ERROR:')) {
      return {
        success: false,
        error: stdout
      };
    }

    const shortcutName = stdout.trim();
    if (!shortcutName || shortcutName === 'ERROR:') {
      return {
        success: false,
        error: stderr || 'Failed to import shortcut: Unknown error'
      };
    }

    return {
      success: true,
      shortcutName
    };
  } catch (error) {
    return {
      success: false,
      error: `Import failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Run a shortcut by name
 */
export async function runShortcut(
  shortcutName: string,
  input?: any,
  timeoutMs: number = 30000
): Promise<RunResult> {
  try {
    const capability = await checkAutomationCapability();
    if (!capability.available) {
      return {
        success: false,
        error: capability.reason
      };
    }

    // Prepare input if provided
    let inputArgs = '';
    if (input !== undefined) {
      if (typeof input === 'object') {
        const tempInputPath = `/tmp/sg_test_input_${Date.now()}.json`;
        await execAsync(`echo '${JSON.stringify(input)}' > "${tempInputPath}"`);
        inputArgs = `--input-path "${tempInputPath}"`;
      } else if (typeof input === 'string') {
        inputArgs = `--input-path /dev/stdin`;
      }
    }

    // Prepare output capture
    const outputPattern = /^SG_OUTPUT: (.*)$/gm;

    // Execute with timeout
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(
      `timeout ${timeoutMs / 1000}s shortcuts run "${shortcutName}" ${inputArgs} 2>&1 || true`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );
    const executionTime = Date.now() - startTime;

    // Parse output
    const outputMatch = outputPattern.exec(stdout);
    const output = outputMatch ? outputMatch[1] : stdout;

    // Check if timeout occurred
    if (stderr.includes('timeout') || executionTime >= timeoutMs) {
      return {
        success: false,
        error: `Execution timeout after ${timeoutMs}ms`,
        executionTime
      };
    }

    // Check for errors in output
    if (stderr && !output) {
      return {
        success: false,
        error: stderr.trim(),
        executionTime
      };
    }

    return {
      success: true,
      output: output.trim(),
      executionTime
    };
  } catch (error) {
    return {
      success: false,
      error: `Run failed: ${error instanceof Error ? error.message : String(error)}`,
      executionTime: 0
    };
  }
}

/**
 * Delete a test shortcut by name
 */
export async function deleteShortcut(shortcutName: string): Promise<DeleteResult> {
  try {
    const capability = await checkAutomationCapability();
    if (!capability.available) {
      return {
        success: false,
        error: capability.reason
      };
    }

    // Delete via shortcuts CLI
    const { stderr } = await execAsync(
      `shortcuts delete "${shortcutName}" 2>&1 || true`
    );

    if (stderr.includes('not found')) {
      // Already deleted, that's fine
      return { success: true };
    }

    if (stderr && !stderr.includes('not found')) {
      return {
        success: false,
        error: stderr.trim()
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Delete failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Complete test lifecycle: import → run → delete
 */
export async function testShortcutLifecycle(
  shortcutFilePath: string,
  input?: any,
  timeoutMs: number = 30000
): Promise<{
  success: boolean;
  shortcutName?: string;
  output?: string;
  executionTime?: number;
  error?: string;
  cleanupError?: string;
}> {
  let shortcutName: string | undefined;

  try {
    // Step 1: Import
    const importResult = await importShortcut(shortcutFilePath);
    if (!importResult.success || !importResult.shortcutName) {
      return {
        success: false,
        error: importResult.error || 'Failed to import shortcut'
      };
    }

    shortcutName = importResult.shortcutName;

    // Step 2: Run
    const runResult = await runShortcut(shortcutName, input, timeoutMs);
    if (!runResult.success) {
      return {
        success: false,
        shortcutName,
        error: runResult.error || 'Failed to run shortcut',
        executionTime: runResult.executionTime
      };
    }

    // Step 3: Cleanup (best effort, don't fail on error)
    const cleanupResult = await deleteShortcut(shortcutName);
    
    return {
      success: true,
      shortcutName,
      output: runResult.output,
      executionTime: runResult.executionTime,
      cleanupError: cleanupResult.success ? undefined : cleanupResult.error
    };
  } catch (error) {
    // Cleanup on error
    if (shortcutName) {
      await deleteShortcut(shortcutName).catch(() => {});
    }

    return {
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
