import { Agent, AgentResult } from './base/agent';
import { ValidationReport, ValidationError, ValidationWarning, PermissionInfo, BaseAgentConfig } from './base/agent-types';
import { validateShortcut } from '../../client/src/lib/shortcuts';
import { analyzeShortcut } from '../../client/src/lib/shortcut-analyzer';
import { AgentLogger } from './base/agent-logger';
import { getFinalActionDatabasePath } from '../runtime-config';

interface ValidationInput {
  shortcut: any;
  strictMode?: boolean;
  checkCompatibility?: boolean;
  targetIOSVersion?: string;
}

interface ValidationConfig extends BaseAgentConfig {
  enableLocalAnalysis?: boolean;
}

export class ShortcutValidatorAgent extends Agent<ValidationInput, ValidationReport> {
  private enableLocalAnalysis: boolean;
  private logger: AgentLogger;

  constructor(config: ValidationConfig = {}) {
    super(config);
    this.enableLocalAnalysis = config.enableLocalAnalysis ?? true;
    this.logger = AgentLogger.getInstance();
  }

  getAgentName(): string {
    return 'ShortcutValidatorAgent';
  }

  validate(input: ValidationInput): boolean {
    return !!input?.shortcut && typeof input.shortcut === 'object';
  }

  async execute(input: ValidationInput): Promise<AgentResult<ValidationReport>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    this.logger.info(this.getAgentName(), `Validating shortcut: ${input.shortcut.name || 'Unnamed'}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info(this.getAgentName(), 'Returning cached validation result');
        return this.createResult(cached, Date.now() - startTime, 0, true);
      }

      // Perform comprehensive validation
      const report = await this.performComprehensiveValidation(input);

      // Cache the result
      this.setCachedResult(cacheKey, report, 60000); // 1 minute cache

      const executionTime = Date.now() - startTime;
      this.logger.performance(this.getAgentName(), 'Validation completed', executionTime);

      return this.createResult(report, executionTime);
    } catch (error: any) {
      this.logger.error(this.getAgentName(), `Validation failed: ${error.message}`, { shortcut: input.shortcut.name });
      return this.createError(error, Date.now() - startTime);
    }
  }

  private async performComprehensiveValidation(input: ValidationInput): Promise<ValidationReport> {
    const { shortcut, strictMode = false, checkCompatibility = true, targetIOSVersion } = input;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const permissions: PermissionInfo[] = [];

    // Phase 1: Basic Structure Validation
    const structureValidation = this.validateStructure(shortcut, strictMode);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);
    permissions.push(...structureValidation.permissions);

    // Phase 2: Action Validation
    const actionValidation = this.validateActions(shortcut);
    errors.push(...actionValidation.errors);
    warnings.push(...actionValidation.warnings);
    permissions.push(...actionValidation.permissions);

    // Phase 3: Data Flow Validation
    const dataFlowValidation = this.validateDataFlow(shortcut);
    errors.push(...dataFlowValidation.errors);
    warnings.push(...dataFlowValidation.warnings);

    // Phase 4: Parameter Validation
    const parameterValidation = this.validateParameters(shortcut);
    errors.push(...parameterValidation.errors);
    warnings.push(...parameterValidation.warnings);

    // Phase 5: Permission Analysis
    const permissionValidation = this.validatePermissions(shortcut);
    permissions.push(...permissionValidation);

    // Phase 6: Compatibility Check
    if (checkCompatibility) {
      const compatibilityValidation = this.validateCompatibility(shortcut, targetIOSVersion);
      errors.push(...compatibilityValidation.errors);
      warnings.push(...compatibilityValidation.warnings);
    }

    // Phase 7: Local Analysis (if enabled)
    let localAnalysis: any = null;
    if (this.enableLocalAnalysis) {
      try {
        localAnalysis = await analyzeShortcut(shortcut);
        this.logger.info(this.getAgentName(), 'Local analysis completed');

        // Add insights from local analysis
        if (localAnalysis.optimizations) {
          localAnalysis.optimizations.forEach((opt: any) => {
            warnings.push({
              type: 'optimization',
              severity: this.mapImpactToSeverity(opt.impact),
              message: opt.description,
              suggestion: opt.suggestion,
              impact: opt.impact
            });
          });
        }

        if (localAnalysis.security) {
          localAnalysis.security.forEach((sec: any) => {
            if (sec.risk === 'high' || sec.risk === 'critical') {
              errors.push({
                type: 'security',
                severity: sec.risk as 'error' | 'warning' | 'info',
                message: sec.description,
                mitigation: sec.mitigation
              });
            } else {
              warnings.push({
                type: 'security',
                severity: sec.risk as 'low' | 'medium' | 'high',
                message: sec.description,
                suggestion: sec.mitigation,
                impact: `Security risk: ${sec.risk}`
              });
            }
          });
        }
      } catch (error) {
        this.logger.warn(this.getAgentName(), 'Local analysis failed', { error: (error as Error).message });
      }
    }

    // Calculate overall score
    const score = this.calculateValidationScore(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      permissions: this.deduplicatePermissions(permissions),
      score
    };
  }

  private validateStructure(shortcut: any, strictMode: boolean): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    permissions: PermissionInfo[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const permissions: PermissionInfo[] = [];

    // Check required fields
    if (!shortcut.name) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: 'Shortcut must have a name',
        action: 'Add a "name" field to the shortcut object'
      });
    }

    if (!Array.isArray(shortcut.actions)) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: 'Shortcut must have an actions array',
        action: 'Add an "actions" array to the shortcut object'
      });
    }

    if (shortcut.actions.length === 0) {
      errors.push({
        type: 'structure',
        severity: strictMode ? 'error' : 'warning',
        message: 'Shortcut has no actions',
        action: 'Add at least one action to the shortcut'
      });
    }

    // Check action limit
    if (shortcut.actions.length > 50) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: `Shortcut has too many actions (${shortcut.actions.length}/50)`,
        action: 'Split into multiple shortcuts or use repeat actions'
      });
    } else if (shortcut.actions.length > 25) {
      warnings.push({
        type: 'performance',
        severity: 'medium',
        message: `Shortcut has many actions (${shortcut.actions.length}/50) - consider optimization`,
        suggestion: 'Look for patterns that can be simplified or repeated',
        impact: 'Performance and maintainability'
      });
    }

    // Check for circular references
    const circularCheck = this.detectCircularReferences(shortcut.actions);
    if (circularCheck.hasCircularReference) {
      errors.push({
        type: 'dependency',
        severity: 'error',
        message: 'Circular reference detected in shortcut actions',
        action: 'Remove or restructure the circular dependency'
      });
    }

    return { errors, warnings, permissions };
  }

  private validateActions(shortcut: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    permissions: PermissionInfo[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const permissions: PermissionInfo[] = [];

    shortcut.actions.forEach((action: any, index: number) => {
      if (!action.type) {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: `Action ${index + 1} missing type`,
          line: index + 1,
          action: 'Add a valid action identifier'
        });
        return;
      }

      // Validate action identifier format
      if (typeof action.type !== 'string') {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: `Action ${index + 1} type must be a string`,
          line: index + 1,
          action: 'Use valid action identifier strings'
        });
      }

      // Check for unknown action identifiers
      const knownActions = ['is.workflow.actions.', 'com.betterttouch'];
      const isKnownAction = knownActions.some(prefix => action.type.startsWith(prefix)) ||
                             action.type === 'if' ||
                             action.type === 'repeat';

      if (!isKnownAction) {
        warnings.push({
          type: 'compatibility',
          severity: 'medium',
          message: `Action ${index + 1} uses potentially unknown identifier: ${action.type}`,
          suggestion: 'Verify this action exists in your iOS version',
          impact: 'Compatibility'
        });
      }

      // Validate parameters
      if (!action.parameters || typeof action.parameters !== 'object') {
        warnings.push({
          type: 'structure',
          severity: 'low',
          message: `Action ${index + 1} missing or invalid parameters`,
          suggestion: 'Add parameters object even if empty',
          impact: 'Functionality'
        });
      }
    });

    return { errors, warnings, permissions };
  }

  private validateDataFlow(shortcut: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Track variables and their sources
    const variables: Map<string, any> = new Map();
    const dataFlow: Map<string, string[]> = new Map();

    // Analyze each action for data flow
    const analyzeAction = (action: any, path: string[] = []) => {
      const actionPath = path.concat([action.type]);

      // Check for variable references in parameters
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([key, value]) => {
          if (typeof value === 'string') {
            const variableRefs = value.match(/\{([^}]+)\}/g);
            if (variableRefs) {
              variableRefs.forEach(variableRef => {
                const varName = variableRef.slice(1, -1); // Remove braces
                if (!dataFlow.has(varName)) {
                  dataFlow.set(varName, []);
                }
                dataFlow.get(varName)!.push(actionPath.join(' > '));
              });
            }
          }
        });
      }

      // Handle nested actions
      if (action.type === 'if' && action.parameters) {
        if (action.parameters.then) {
          action.parameters.then.forEach((nestedAction: any) => {
            if (typeof nestedAction === 'object') {
              analyzeAction(nestedAction, actionPath.concat(['then']));
            }
          });
        }
        if (action.parameters.else) {
          action.parameters.else.forEach((nestedAction: any) => {
            if (typeof nestedAction === 'object') {
              analyzeAction(nestedAction, actionPath.concat(['else']));
            }
          });
        }
      }

      if (action.type === 'repeat' && action.parameters?.actions) {
        action.parameters.actions.forEach((nestedAction: any) => {
          if (typeof nestedAction === 'object') {
            analyzeAction(nestedAction, actionPath.concat(['repeat']));
          }
        });
      }
    };

    shortcut.actions.forEach((action, index) => {
      analyzeAction(action, [`Action ${index + 1}`]);
    });

    // Check for unused variables
    dataFlow.forEach((usages, variable) => {
      if (usages.length === 0) {
        warnings.push({
          type: 'optimization',
          severity: 'low',
          message: `Variable "${variable}" is defined but never used`,
          suggestion: 'Remove the variable or use it in subsequent actions',
          impact: 'Code clarity'
        });
      }
    });

    // Check for variables used but not defined
    const allVariableUsages = new Set<string>();
    dataFlow.forEach(usages => allVariableUsages.add(usages));

    const definedVariables = new Set<string>();
    shortcut.actions.forEach((action: any) => {
      if (action.parameters?.ask?.prompt) {
        definedVariables.add(action.parameters.ask.prompt);
      }
    });

    allVariableUsages.forEach(variable => {
      if (!definedVariables.has(variable)) {
        warnings.push({
          type: 'dependency',
          severity: 'medium',
          message: `Variable "${variable}" is used but not defined`,
          suggestion: 'Add an action to define this variable or check spelling',
          impact: 'Runtime errors'
        });
      }
    });

    return { errors, warnings };
  }

  private validateParameters(shortcut: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Load action database for parameter validation
    try {
      const fs = await import('fs/promises');
      const actionDbPath = getFinalActionDatabasePath();
      const actionDb = JSON.parse(await fs.readFile(actionDbPath, 'utf8'));

      shortcut.actions.forEach((action: any, index) => {
        if (!actionDb[action.type]) {
          return; // Skip unknown actions
        }

        const actionConfig = actionDb[action.type];
        if (!actionConfig.parameters) return;

        actionConfig.parameters.forEach((paramConfig: any) => {
          const paramName = paramConfig.key || paramConfig.name;
          const providedValue = action.parameters?.[paramName];

          // Check required parameters
          if (paramConfig.required && (providedValue === undefined || providedValue === null || providedValue === '')) {
            errors.push({
              type: 'parameter',
              severity: 'error',
              message: `Action ${index + 1} (${action.type}) missing required parameter: ${paramName}`,
              line: index + 1,
              action: `Add the required "${paramName}" parameter`
            });
          }

          // Validate parameter type
          if (providedValue !== undefined && paramConfig.type) {
            const validationError = this.validateParameterType(providedValue, paramConfig.type, action.type, paramName, index + 1);
            if (validationError) {
              errors.push(validationError);
            }
          }
        });
      });
    } catch (error) {
      this.logger.warn(this.getAgentName(), 'Could not validate parameters against action database', { error: (error as Error).message });
    }

    return { errors, warnings };
  }

  private validateParameterType(value: any, expectedType: string, actionType: string, paramName: string, actionIndex: number): ValidationError | null {
    // Basic type validation
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            type: 'parameter',
            severity: 'error',
            message: `Action ${actionIndex} (${actionType}) parameter "${paramName}" must be a string, got ${typeof value}`,
            line: actionIndex,
            action: `Convert "${paramName}" to a string value`
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && !this.isNumericString(value)) {
          return {
            type: 'parameter',
            severity: 'error',
            message: `Action ${actionIndex} (${actionType}) parameter "${paramName}" must be a number`,
            line: actionIndex,
            action: `Ensure "${paramName}" is a numeric value`
          };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && !this.isBooleanString(value)) {
          return {
            type: 'parameter',
            severity: 'error',
            message: `Action ${actionIndex} (${actionType}) parameter "${paramName}" must be a boolean`,
            line: actionIndex,
            action: `Ensure "${paramName}" is true or false`
          };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return {
            type: 'parameter',
            severity: 'error',
            message: `Action ${actionIndex} (${actionType}) parameter "${paramName}" must be an array`,
            line: actionIndex,
            action: `Convert "${paramName}" to an array`
          };
        }
        break;
    }

    return null;
  }

  private isNumericString(value: any): boolean {
    return typeof value === 'string' && !isNaN(Number(value));
  }

  private isBooleanString(value: any): boolean {
    return typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase());
  }

  private validatePermissions(shortcut: any): PermissionInfo[] {
    const permissions: PermissionInfo[] = [];
    const permissionMap: Record<string, PermissionInfo> = {
      'is.workflow.actions.notification': {
        permission: 'notification',
        required: true,
        reason: 'Required to display notifications to user',
        scope: 'minimal'
      },
      'is.workflow.actions.getcurrentlocation': {
        permission: 'location',
        required: true,
        reason: 'Required to access device location',
        scope: 'extensive'
      },
      'is.workflow.actions.takephoto': {
        permission: 'camera',
        required: true,
        reason: 'Required to access camera',
        scope: 'extensive'
      },
      'is.workflow.actions.selectphotos': {
        permission: 'photo-library',
        required: true,
        reason: 'Required to access photo library',
        scope: 'extensive'
      },
      'is.workflow.actions.setvolume': {
        permission: 'device',
        required: true,
        reason: 'Required to control device volume',
        scope: 'moderate'
      }
    };

    const addedPermissions = new Set<string>();

    shortcut.actions.forEach(action => {
      const permInfo = permissionMap[action.type];
      if (permInfo && !addedPermissions.has(permInfo.permission)) {
        permissions.push(permInfo);
        addedPermissions.add(permInfo.permission);
      }
    });

    return permissions;
  }

  private validateCompatibility(shortcut: any, targetIOSVersion?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for iOS version-specific features
    const newerFeatures = [
      'is.workflow.actions.imagereasoning', // iOS 17+
      'is.workflow.actions.speechrecognize', // iOS 17+
      'is.workflow.actions.detectlandmarks', // iOS 17+
    ];

    shortcut.actions.forEach((action, index) => {
      if (newerFeatures.includes(action.type)) {
        warnings.push({
          type: 'compatibility',
          severity: 'medium',
          message: `Action ${index + 1} (${action.type}) may require iOS 17 or later`,
          suggestion: 'Check iOS version compatibility',
          impact: 'Compatibility'
        });
      }
    });

    // Check for deprecated actions
    const deprecatedActions = [
      // Add known deprecated action identifiers
    ];

    shortcut.actions.forEach((action, index) => {
      if (deprecatedActions.includes(action.type)) {
        warnings.push({
          type: 'compatibility',
          severity: 'high',
          message: `Action ${index + 1} (${action.type}) is deprecated`,
          suggestion: 'Use the recommended replacement action',
          impact: 'Future compatibility'
        });
      }
    });

    return { errors, warnings };
  }

  private detectCircularReferences(actions: any[]): { hasCircularReference: boolean; cycle?: string[] } {
    const visited = new Set<string>();
    const recursionStack: string[] = [];

    const checkAction = (action: any, path: string[] = []): boolean => {
      const actionId = `${action.type}_${JSON.stringify(action.parameters)}`;

      if (recursionStack.includes(actionId)) {
        const cycleIndex = recursionStack.indexOf(actionId);
        return true; // Circular reference detected
      }

      if (visited.has(actionId)) {
        return false; // Already processed this action
      }

      visited.add(actionId);
      recursionStack.push(actionId);

      // Check nested actions
      if (action.type === 'if' && action.parameters) {
        if (action.parameters.then && Array.isArray(action.parameters.then)) {
          for (const nestedAction of action.parameters.then) {
            if (typeof nestedAction === 'object' && checkAction(nestedAction, path.concat(['then']))) {
              return true;
            }
          }
        }
        if (action.parameters.else && Array.isArray(action.parameters.else)) {
          for (const nestedAction of action.parameters.else) {
            if (typeof nestedAction === 'object' && checkAction(nestedAction, path.concat(['else']))) {
              return true;
            }
          }
        }
      }

      if (action.type === 'repeat' && action.parameters?.actions) {
        for (const nestedAction of action.parameters.actions) {
          if (typeof nestedAction === 'object' && checkAction(nestedAction, path.concat(['repeat']))) {
            return true;
          }
        }
      }

      recursionStack.pop();
      return false;
    };

    const hasCircularReference = actions.some(action => checkAction(action));
    return { hasCircularReference };
  }

  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    // Base score of 100
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'error':
          score -= 25;
          break;
        default:
          score -= 10;
      }
    });

    // Deduct points for warnings
    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private mapImpactToSeverity(impact: string): 'low' | 'medium' | 'high' {
    const impactMap: Record<string, 'low' | 'medium' | 'high'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'high'
    };

    return impactMap[impact.toLowerCase()] || 'medium';
  }

  private deduplicatePermissions(permissions: PermissionInfo[]): PermissionInfo[] {
    const seen = new Set<string>();
    return permissions.filter(perm => {
      const key = perm.permission;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
