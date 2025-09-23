import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface SigningResult {
  success: boolean;
  signedFilePath?: string;
  error?: string;
  signature?: string;
}

interface SigningOptions {
  mode: 'anyone' | 'contacts-only';
  outputDir: string;
}

// Check if we're running on macOS and have shortcuts CLI available
export async function checkSigningCapability(): Promise<{ available: boolean; reason?: string }> {
  try {
    // Check if running on macOS
    if (process.platform !== 'darwin') {
      return {
        available: false,
        reason: 'Shortcut signing is only available on macOS'
      };
    }

    // Check if shortcuts command is available
    await execAsync('which shortcuts');

    // Test if shortcuts sign command works
    await execAsync('shortcuts sign --help');

    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason: 'shortcuts command not found. Please ensure Shortcuts.app is installed and the shortcuts command line tool is available.'
    };
  }
}

// Sign a shortcut file using macOS shortcuts command
export async function signShortcut(
  shortcutFilePath: string,
  options: SigningOptions = { mode: 'anyone', outputDir: '/tmp' }
): Promise<SigningResult> {
  try {
    const capability = await checkSigningCapability();
    if (!capability.available) {
      return {
        success: false,
        error: capability.reason
      };
    }

    // Generate output file path
    const filename = path.basename(shortcutFilePath, '.shortcut');
    const outputPath = path.join(options.outputDir, `${filename}_signed.shortcut`);

    // Build signing command
    const modeFlag = options.mode === 'anyone' ? '--mode anyone' : '--mode contacts-only';
    const command = `shortcuts sign --input "${shortcutFilePath}" --output "${outputPath}" ${modeFlag}`;

    console.log(`Executing signing command: ${command}`);

    // Execute signing
    const { stdout, stderr } = await execAsync(command);

    // Check if output file was created
    try {
      await fs.access(outputPath);

      // Generate signature hash for verification
      const fileContent = await fs.readFile(outputPath);
      const signature = crypto.createHash('sha256').update(fileContent).digest('hex');

      return {
        success: true,
        signedFilePath: outputPath,
        signature
      };
    } catch (accessError) {
      return {
        success: false,
        error: `Signed file was not created at ${outputPath}. Command output: ${stdout}, Error: ${stderr}`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Create a self-signed shortcut for testing purposes
export async function createMockSignedShortcut(
  shortcutFilePath: string,
  outputDir: string = '/tmp'
): Promise<SigningResult> {
  try {
    const filename = path.basename(shortcutFilePath, '.shortcut');
    const outputPath = path.join(outputDir, `${filename}_mock_signed.shortcut`);

    // Read original file
    const originalContent = await fs.readFile(shortcutFilePath);

    // Add mock signing metadata (this is for development/testing only)
    const mockMetadata = {
      signature: crypto.createHash('sha256').update(originalContent).digest('hex'),
      signedAt: new Date().toISOString(),
      mode: 'anyone',
      mock: true
    };

    // For demonstration, we'll just copy the file and add metadata as a comment
    const mockSignedContent = originalContent.toString() + `\n<!-- Mock Signature: ${JSON.stringify(mockMetadata)} -->`;

    await fs.writeFile(outputPath, mockSignedContent);

    return {
      success: true,
      signedFilePath: outputPath,
      signature: mockMetadata.signature
    };

  } catch (error) {
    return {
      success: false,
      error: `Mock signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Verify if a shortcut file is signed
export async function verifyShortcutSignature(filePath: string): Promise<{ signed: boolean; valid?: boolean; info?: any }> {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Check for mock signature first
    if (content.includes('Mock Signature:')) {
      const mockMatch = content.match(/Mock Signature: (.+) -->/);
      if (mockMatch) {
        const mockData = JSON.parse(mockMatch[1]);
        return {
          signed: true,
          valid: true,
          info: { ...mockData, type: 'mock' }
        };
      }
    }

    // For real signatures, we'd need to parse the plist and check Apple's signature
    // This is a simplified check - real implementation would verify against Apple's CA
    const capability = await checkSigningCapability();
    if (capability.available) {
      try {
        // Use shortcuts list to see if shortcut is valid
        await execAsync(`shortcuts list | grep -q "${path.basename(filePath, '.shortcut')}"`);
        return { signed: true, valid: true, info: { type: 'apple' } };
      } catch {
        // If shortcuts list doesn't show it, it might still be signed but not installed
        return { signed: false };
      }
    }

    return { signed: false };

  } catch (error) {
    return {
      signed: false,
      info: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Get signing information and requirements
export function getSigningInfo(): {
  platform: string;
  available: boolean;
  requirements: string[];
  capabilities: string[];
} {
  return {
    platform: process.platform,
    available: process.platform === 'darwin',
    requirements: [
      'macOS operating system',
      'Shortcuts.app installed',
      'shortcuts command line tool enabled',
      'Developer account (for contacts-only mode)'
    ],
    capabilities: process.platform === 'darwin' ? [
      'Sign shortcuts for anyone',
      'Sign shortcuts for contacts only',
      'Verify existing signatures',
      'List installed shortcuts'
    ] : [
      'Mock signing for development',
      'Basic verification'
    ]
  };
}