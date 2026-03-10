import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { convertToPlist } from './shortcut-builder';
import {
  testShortcutLifecycle,
  checkAutomationCapability,
  type ImportResult,
  type RunResult
} from './macos-automation';
import { validateShortcutDataFlow, formatValidationIssuesForAI } from './shortcut-validator';

export interface TestRequest {
  shortcut: any;
  input?: any;
  timeout?: number;
  skipCleanup?: boolean;
}

export interface TestResult {
  success: boolean;
  executionTime: number;
  actionsExecuted: number;
  output?: any;
  error?: TestError;
  warnings: TestWarning[];
  validationIssues: ValidationIssue[];
  shortcutName?: string;
  cleanupError?: string;
}

export interface TestError {
  message: string;
  stage: 'validation' | 'import' | 'run' | 'cleanup';
  actionIndex?: number;
  actionType?: string;
}

export interface TestWarning {
  message: string;
  type: 'permission' | 'dataflow' | 'compatibility' | 'performance';
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  actionIndex: number;
  field?: string;
  message: string;
  suggestedFix?: string;
}

/**
 * Main shortcut testing service
 */
export class ShortcutTester {
  private tempDir: string;
  
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_tests');
  }

  /**
   * Initialize the tester
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Test a shortcut with full lifecycle
   */
  async test(request: TestRequest): Promise<TestResult> {
    const startTime = Date.now();
    const warnings: TestWarning[] = [];
    const validationIssues: ValidationIssue[] = [];

    try {
      // Step 1: Static validation
      const staticValidation = await this.performStaticValidation(request.shortcut);
      validationIssues.push(...staticValidation.issues);
      warnings.push(...staticValidation.warnings);

      // If critical validation errors, fail early
      if (staticValidation.criticalErrors > 0) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          actionsExecuted: 0,
          error: {
            message: `Shortcut has ${staticValidation.criticalErrors} critical validation errors`,
            stage: 'validation'
          },
          warnings,
          validationIssues
        };
      }

      // Step 2: Build shortcut file
      const shortcutFile = await this.buildShortcutFile(request.shortcut);
      const actionsCount = request.shortcut.actions?.length || 0;

      // Step 3: Check automation capability
      const capability = await checkAutomationCapability();
      if (!capability.available) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          actionsExecuted: 0,
          error: {
            message: capability.reason || 'Automation not available',
            stage: 'import'
          },
          warnings,
          validationIssues
        };
      }

      // Step 4: Run full lifecycle test
      const lifecycleResult = await testShortcutLifecycle(
        shortcutFile,
        request.input,
        request.timeout || 30000
      );

      if (!lifecycleResult.success) {
        // Determine failure stage
        let errorStage: TestError['stage'] = 'run';
        let errorMessage = lifecycleResult.error || 'Unknown error';

        if (errorMessage.includes('import')) {
          errorStage = 'import';
        } else if (errorMessage.includes('validation')) {
          errorStage = 'validation';
        }

        return {
          success: false,
          executionTime: lifecycleResult.executionTime || Date.now() - startTime,
          actionsExecuted: 0,
          error: {
            message: errorMessage,
            stage: errorStage
          },
          shortcutName: lifecycleResult.shortcutName,
          cleanupError: lifecycleResult.cleanupError,
          warnings,
          validationIssues
        };
      }

      // Step 5: Parse output
      let output: any;
      try {
        output = this.parseOutput(lifecycleResult.output);
      } catch (error) {
        warnings.push({
          message: 'Failed to parse output as JSON, treating as raw text',
          type: 'compatibility'
        });
        output = lifecycleResult.output;
      }

      return {
        success: true,
        executionTime: lifecycleResult.executionTime || Date.now() - startTime,
        actionsExecuted: actionsCount,
        output,
        shortcutName: lifecycleResult.shortcutName,
        cleanupError: lifecycleResult.cleanupError,
        warnings,
        validationIssues
      };

    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        actionsExecuted: 0,
        error: {
          message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
          stage: 'run'
        },
        warnings,
        validationIssues
      };
    }
  }

  /**
   * Perform static validation before runtime test
   */
  private async performStaticValidation(shortcut: any): Promise<{
    issues: ValidationIssue[];
    warnings: TestWarning[];
    criticalErrors: number;
  }> {
    const issues = validateShortcutDataFlow(shortcut);
    const warnings: TestWarning[] = [];
    let criticalErrors = 0;

    // Check for critical issues
    issues.forEach(issue => {
      if (issue.severity === 'error') {
        criticalErrors++;
      }
    });

    // Check for permission requirements
    if (shortcut.actions) {
      shortcut.actions.forEach((action: any, index: number) => {
        const actionType = action.type || action.WFWorkflowActionIdentifier;
        
        // Check for actions that require specific permissions
        if (actionType?.includes('location')) {
          warnings.push({
            message: `Action ${index + 1} requires Location Services permission`,
            type: 'permission'
          });
        }
        if (actionType?.includes('health')) {
          warnings.push({
            message: `Action ${index + 1} requires HealthKit permission`,
            type: 'permission'
          });
        }
        if (actionType?.includes('homekit')) {
          warnings.push({
            message: `Action ${index + 1} requires HomeKit permission`,
            type: 'permission'
          });
        }
      });
    }

    return { issues, warnings, criticalErrors };
  }

  /**
   * Build shortcut file for testing
   */
  private async buildShortcutFile(shortcut: any): Promise<string> {
    const id = crypto.randomBytes(8).toString('hex');
    const filename = `test_shortcut_${id}.shortcut`;
    const filepath = path.join(this.tempDir, filename);

    // Convert to plist
    const plistBuffer = convertToPlist(shortcut);
    
    // Write to temp file
    await fs.writeFile(filepath, plistBuffer);

    return filepath;
  }

  /**
   * Parse output from shortcut execution
   */
  private parseOutput(output?: string): any {
    if (!output) {
      return null;
    }

    // Try JSON parse
    try {
      return JSON.parse(output);
    } catch {
      // Try extracting JSON from text
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // Not valid JSON
        }
      }
    }

    // Return raw text
    return output;
  }

  /**
   * Cleanup test files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)))
      );
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Get testing capability status
   */
  async getCapabilityStatus(): Promise<{
    available: boolean;
    reason?: string;
    needsPermissions?: boolean;
    platform: string;
  }> {
    const capability = await checkAutomationCapability();
    return {
      ...capability,
      platform: process.platform
    };
  }
}

// Singleton instance
let testerInstance: ShortcutTester | null = null;

export async function getShortcutTester(): Promise<ShortcutTester> {
  if (!testerInstance) {
    testerInstance = new ShortcutTester();
    await testerInstance.initialize();
  }
  return testerInstance;
}
