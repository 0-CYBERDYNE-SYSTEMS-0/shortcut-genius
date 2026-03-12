import { Agent, AgentResult } from './base/agent';
import { DocumentationOutput, UsageExample, TroubleshootingItem, BaseAgentConfig } from './base/agent-types';
import { AgentLogger } from './base/agent-logger';

interface DocumentationInput {
  shortcut: any;
  documentationLevel?: 'basic' | 'detailed' | 'comprehensive';
  includeExamples?: boolean;
  format?: 'markdown' | 'html' | 'json';
}

export class DocumentationAgent extends Agent<DocumentationInput, DocumentationOutput> {
  private logger: AgentLogger;

  constructor(config: {
    enableExamples?: boolean;
    enableTroubleshooting?: boolean;
  } = {}) {
    super(config);
    this.logger = AgentLogger.getInstance();
  }

  getAgentName(): string {
    return 'DocumentationAgent';
  }

  validate(input: DocumentationInput): boolean {
    return !!input?.shortcut && typeof input.shortcut === 'object';
  }

  async execute(input: DocumentationInput): Promise<AgentResult<DocumentationOutput>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    this.logger.info(this.getAgentName(), `Generating documentation for: ${input.shortcut.name || 'Unnamed'}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info(this.getAgentName(), 'Returning cached documentation');
        return this.createResult(cached, Date.now() - startTime, 0, true);
      }

      // Generate documentation
      const documentation = await this.generateDocumentation(input);

      // Cache the result
      this.setCachedResult(cacheKey, documentation, 60000); // 1 minute cache

      const executionTime = Date.now() - startTime;
      this.logger.performance(this.getAgentName(), 'Documentation generation completed', executionTime);

      return this.createResult(documentation, executionTime);
    } catch (error: any) {
      this.logger.error(this.getAgentName(), `Documentation generation failed: ${error.message}`, { shortcut: input.shortcut.name });
      return this.createError(error, Date.now() - startTime);
    }
  }

  private async generateDocumentation(input: DocumentationInput): Promise<DocumentationOutput> {
    const { shortcut, documentationLevel = 'detailed', includeExamples = true, format = 'markdown' } = input;

    // Phase 1: Technical Specification
    const technicalSpec = this.generateTechnicalSpec(shortcut, documentationLevel);

    // Phase 2: Usage Guide
    const usageGuide = this.generateUsageGuide(shortcut, documentationLevel);

    // Phase 3: Examples
    const examples = includeExamples ? this.generateUsageExamples(shortcut) : [];

    // Phase 4: Troubleshooting
    const troubleshooting = includeExamples ? this.generateTroubleshooting(shortcut) : [];

    // Phase 5: Performance Metrics
    const performanceMetrics = this.analyzePerformance(shortcut);

    return {
      usageGuide,
      technicalSpec,
      examples,
      troubleshooting,
      format,
      lastUpdated: new Date()
    };
  }

  private generateTechnicalSpec(shortcut: any, level: string): string {
    const lines: string[] = [];

    lines.push('# Technical Specification');
    lines.push('');

    // Basic Information
    lines.push('## Basic Information');
    lines.push(`- **Name**: ${shortcut.name || 'Untitled Shortcut'}`);
    lines.push(`- **Actions**: ${shortcut.actions?.length || 0}`);
    lines.push(`- **Complexity**: ${this.calculateComplexity(shortcut)}/10`);
    lines.push(`- **Estimated Size**: ${this.estimateShortcutSize(shortcut)} KB`);
    lines.push('');

    // Actions Breakdown
    if (shortcut.actions && shortcut.actions.length > 0) {
      lines.push('## Actions Breakdown');
      lines.push('');

      shortcut.actions.forEach((action, index) => {
        lines.push(`### Action ${index + 1}: ${this.getActionName(action.type)}`);
        lines.push(`**Identifier**: \`${action.type}\``);
        lines.push(`**Description**: ${this.getActionDescription(action)}`);

        if (action.parameters && Object.keys(action.parameters).length > 0) {
          lines.push('**Parameters:**');
          Object.entries(action.parameters).forEach(([key, value]) => {
            lines.push(`- \`${key}\`: ${this.formatParameterValue(value)}`);
          });
          lines.push('');
        }

        // Add data flow information
        const dataFlow = this.getActionDataFlow(action, index, shortcut.actions);
        if (dataFlow.inputs.length > 0 || dataFlow.outputs.length > 0) {
          lines.push(`**Data Flow:**`);
          if (dataFlow.inputs.length > 0) {
            lines.push(`Inputs: ${dataFlow.inputs.join(', ')}`);
          }
          if (dataFlow.outputs.length > 0) {
            lines.push(`Outputs: ${dataFlow.outputs.join(', ')}`);
          }
        }

        lines.push('');
      });
    }

    // Dependencies
    const dependencies = this.analyzeDependencies(shortcut);
    if (dependencies.length > 0) {
      lines.push('## Dependencies');
      lines.push('');

      dependencies.forEach((dep, index) => {
        lines.push(`### Dependency ${index + 1}`);
        lines.push(`**Source**: ${dep.source}`);
        lines.push(`**Dependencies**: ${dep.dependencies.join(', ')}`);
        lines.push(`**Dependents**: ${dep.dependents.join(', ')}`);
        lines.push('');
      });
    }

    // Permissions
    const permissions = this.analyzePermissions(shortcut);
    if (permissions.length > 0) {
      lines.push('## Permissions Required');
      lines.push('');
      permissions.forEach((perm, index) => {
        lines.push(`### ${index + 1}. ${perm.permission}`);
        lines.push(`**Required**: ${perm.required ? 'Yes' : 'No'}`);
        lines.push(`**Reason**: ${perm.reason}`);
        if (perm.alternative) {
          lines.push(`**Alternative**: ${perm.alternative}`);
        }
        lines.push(`**Scope**: ${perm.scope}`);
        lines.push('');
      });
    }

    // iOS Version Compatibility
    const iosCompatibility = this.analyzeIOSCompatibility(shortcut);
    lines.push('## iOS Version Compatibility');
    lines.push(`- **Minimum Version**: ${iosCompatibility.minimumVersion || 'iOS 14.0'}`);
    lines.push(`- **Recommended Version**: ${iosCompatibility.recommendedVersion || 'Latest'}`);
    lines.push(`- **Compatibility Issues**: ${iosCompatibility.issues.length > 0 ? iosCompatibility.issues.join(', ') : 'None'}`);
    lines.push('');

    return lines.join('\n');
  }

  private generateUsageGuide(shortcut: any, level: string): string {
    const lines: string[] = [];

    lines.push('# Usage Guide');
    lines.push('');
    lines.push(`## Overview`);
    lines.push(this.getActionSummary(shortcut));
    lines.push('');

    // Before Using
    lines.push('## Before Using This Shortcut');
    lines.push('1. Ensure all required permissions are granted');

    const permissions = this.analyzePermissions(shortcut);
    if (permissions.length > 0) {
      lines.push('2. Request the following permissions:');
      permissions.forEach((perm, index) => {
        lines.push(`   - ${perm.permission} (${perm.scope} scope)`);
      });
    }
    lines.push('3. Test with safe data first');
    lines.push('4. Review the technical specification');
    lines.push('');

    // Installation/Setup
    lines.push('## Installation');
    lines.push('1. Copy the shortcut JSON or use the import function');
    lines.push('2. Paste into ShortcutGenius editor or import .shortcut file');
    lines.push('3. Click "Apply to Editor" if using chat interface');
    lines.push('4. Save and test the shortcut');
    lines.push('5. Install the shortcut from the Shortcuts app');
    lines.push('');

    // How to Use
    lines.push('## How to Use');
    const usageSteps = this.generateUsageSteps(shortcut);
    usageSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.description}`);
      if (step.code) {
        lines.push(`   \`\`\`${step.code}\`\`\``);
      }
      lines.push('');
    });

    // Expected Results
    lines.push('## Expected Results');
    const results = this.getExpectedResults(shortcut);
    if (results.length > 0) {
      results.forEach((result, index) => {
        lines.push(`${index + 1}. ${result}`);
      });
    } else {
      lines.push('1. Shortcut will execute successfully');
      lines.push('2. User will receive appropriate notifications');
      lines.push('3. Data will be processed as designed');
    }
    lines.push('');

    // Customization Options
    const customizations = this.identifyCustomizationOptions(shortcut);
    if (customizations.length > 0) {
      lines.push('## Customization Options');
      customizations.forEach((option, index) => {
        lines.push(`- ${option.name}: ${option.description}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateUsageSteps(shortcut: any): Array<{
    description: string;
    code?: string;
  }> {
    const steps: Array<{ description: string; code?: string }> = [];

    // Generate steps based on first few actions
    const firstActions = shortcut.actions.slice(0, 5);

    firstActions.forEach((action, index) => {
      const actionName = this.getActionName(action.type);
      const description = this.getActionDescription(action);

      if (index === 0) {
        steps.push({
          description: `Run the "${actionName}" action`
        });
      } else {
        steps.push({
          description: `Then use the "${actionName}" action`
        });
      }

      // Add code example if it's a parameterized action
      if (action.parameters && Object.keys(action.parameters).length > 0) {
        const example = this.generateExampleParameters(action);
        steps.push({
          description: `Provide parameters: ${example}`
        });
      }
    });

    return steps;
  }

  private generateExampleParameters(action: any): string {
    const params: string[] = [];
    Object.entries(action.parameters || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.push(`--${key}="${value}"`);
      } else if (typeof value === 'boolean') {
        params.push(`--${key}=${value}`);
      } else if (typeof value === 'number') {
        params.push(`--${key}=${value}`);
      }
    });
    return params.join(' ');
  }

  private getActionSummary(shortcut: any): string {
    if (!shortcut.name) return 'This iOS Shortcut performs automation tasks.';

    const actionTypes = shortcut.actions.map((action: any) => this.getActionName(action.type));
    const uniqueActions = [...new Set(actionTypes)];

    return `This iOS Shortcut ${shortcut.name} performs ${actionTypes.length} action${actionTypes.length === 1 ? '' : 's'} including ${uniqueActions.join(', ')}.`;
  }

  private getExpectedResults(shortcut: string[] {
    const results: string[] = [];

    shortcut.actions.forEach((action: any, index) => {
      switch (action.type) {
        case 'is.workflow.actions.notification':
          results.push('Displays notification with the specified content');
          break;
        case 'is.workflow.actions.speak':
          results.push('Speaks the provided text using iOS text-to-speech');
          break;
        case 'is.workflow.actions.getclipboard':
          results.push('Gets content from the clipboard');
          break;
        case 'is.workflow.actions.setvariable':
          results.push('Sets a variable for use in later actions');
          break;
        case 'is.workflow.actions.showresult':
          results.push('Shows the result of previous actions');
          break;
        default:
          results.push(`Executes ${action.type} action`);
      }
    });

    return results;
  }

  private identifyCustomizationOptions(shortcut: any): Array<{
    name: string;
    description: string;
  }> {
    const options: Array<{ name: string; description: string }> = [];

    // Check for configurable parameters
    shortcut.actions.forEach((action, index) => {
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([key, value]) => {
          if (this.isConfigurableParameter(key, value)) {
            options.push({
              name: `Customize ${key} parameter`,
              description: `Modify the ${key} parameter value`
            });
          }
        });
      }
    });

    return options;
  }

  private generateUsageExamples(shortcut: any): UsageExample[] {
    const examples: UsageExample[] = [];

    // Example 1: Basic Usage
    examples.push({
      title: 'Basic Usage',
      description: 'How to run the shortcut with default parameters',
      steps: [
        'Run the shortcut directly from the Shortcuts app',
        'Provide any required inputs when prompted',
        'Review the output or results'
      ],
      expectedResult: 'Shortcut executes and produces the expected output'
    });

    // Example 2: Advanced Usage
    const customizableActions = shortcut.actions.filter(action =>
      action.parameters && this.hasConfigurableParameters(action)
    );

    if (customizableActions.length > 0) {
      examples.push({
        title: 'Advanced Usage with Custom Parameters',
        description: 'Using the shortcut with custom parameter values',
        steps: [
          'Run the shortcut with --parameter="custom-value"',
          'Provide your specific requirements',
          'Review the results'
        ],
        expectedResult: 'Shortcut with customized behavior'
      });
    }

    return examples;
  }

  private generateTroubleshooting(shortcut: any): TroubleshootingItem[] {
    const issues: TroubleshootingItem[] = [];

    // Common issues
    issues.push({
      problem: 'Shortcut not executing',
      symptoms: ['Nothing happens when running shortcut', 'No output generated'],
      causes: ['Missing permissions', 'Invalid action identifiers', 'Malformed JSON'],
      solutions: [
        'Check if all required permissions are granted',
        'Validate JSON structure',
        'Test with simple shortcuts first'
      ],
      prevention: 'Always test shortcuts with simple examples before complex ones'
    });

    // Permission issues
    issues.push({
      problem: 'Permission denied errors',
      symptoms: ['Permission request denied dialog appears', 'Errors with access to contacts, location, camera'],
      causes: ['Missing permission in iOS Settings', 'User denied permission', 'App restrictions'],
      solutions: [
        'Check iOS Settings > Shortcuts > Permissions',
        'Grant required permissions when prompted',
        'Review permission requirements'
      ],
      prevention: 'List all permissions in technical documentation'
    });

    // Network issues
    issues.push({
      problem: 'Network connectivity problems',
      symptoms: 'URL fetching fails or timeouts',
      causes: ['No internet connection', 'Server unavailable', 'DNS issues'],
      solutions: [
        'Check network connectivity',
        'Verify URLs are accessible',
        'Test with network connectivity check'
      ],
      prevention: 'Implement network error handling'
    });

    // Data validation issues
    issues.push({
      problem: 'Invalid parameter values',
      numbers: ['Type errors', 'Invalid format', 'Parameter validation errors'],
      causes: ['Wrong data types', 'Missing required parameters'],
      solutions: [
        'Check parameter requirements in action database',
        'Validate input data types',
        'Use proper data validation'
      ],
      prevention: 'Add parameter validation'
    });

    // Performance issues
    issues.push({
      problem: 'Shortcut runs slowly',
      symptoms: ['Long execution times', 'Timeouts during execution'],
      causes: ['Complex logic', 'Too many actions', 'Inefficient algorithms'],
      solutions: [
        'Break down complex shortcuts',
        'Optimize data flow',
        'Consider using caching for external API calls'
      ],
      prevention: 'Test performance during development'
    });

    return issues;
  }

  private getActionName(actionType: string): string {
    const actionNames: Record<string, string> = {
      'is.workflow.actions.notification': 'Show Notification',
      'is.workflow.actions.speak': 'Speak Text',
      'is.workflow.actions.ask': 'Ask for Input',
      'is.workflow.actions.gettext': 'Get Text',
      'is.workflow.actions.getvariable': 'Get Variable',
      'is.workflow.actions.setvariable': 'Set Variable',
      'is.workflow.actions.if': 'If Statement',
      'is.workflow.actions.repeat': 'Repeat Action',
      'is.workflow.actions.url': 'Open URL',
      'is.workflow.actions.getcontentsofurl': 'Get Contents of URL',
      'is.workflow.actions.playmusic': 'Play Music',
      'is.workflow.actions.getcurrentlocation': 'Get Current Location',
      'is.workflow.actions.getcurrentweather': 'Get Current Weather'
    };

    return actionNames[actionType] || `Unknown Action (${actionType})`;
  }

  private getActionDescription(action: any): string {
    const descriptions: Record<string, string> = {
      'is.workflow.actions.notification': 'Displays a notification to the user',
      'is.workflow.actions.speak': 'Converts text to speech and plays it aloud',
      'is.workflow.actions.ask': 'Prompts user for input',
      'is.workflow.actions.gettext': 'Gets text input from user or previous output',
      'is.workflow.actions.getvariable': 'Retrieves a variable value',
      'is.workflow.actions.setvariable': 'Stores a value in a variable',
      'is.workflow.actions.if': 'Performs conditional logic',
      'is.workflow.actions.repeat': 'Repeats actions multiple times',
      'is.workflow.actions.url': 'Opens a URL in the default browser',
      'is.workflow.actions.getcontentsofurl': 'Fetches content from a URL'
    };

    return descriptions[action.type] || `Performs ${action.type} action`;
  }

  private getActionDataFlow(action: any, index: number, allActions: any[]): {
    inputs: string[];
    outputs: string[];
  } {
    const inputs: string[] = [];
    const outputs: string[] = [];

    // Analyze parameters for variable references
    if (action.parameters) {
      Object.values(action.parameters).forEach(value => {
        if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
          const matches = value.match(/\{([^}]+)\}/g);
          if (matches) {
            inputs.push(...matches.map(m => m.slice(1, -1)));
          }
        }
      });
    }

    // Determine outputs based on action type
    switch (action.type) {
      case 'is.workflow.actions.gettext':
        outputs.push('string');
        break;
      case 'is.workflow.actions.getvariable':
        outputs.push('any');
        break;
      case 'is.workflow.actions.ask':
        outputs.push('string');
        break;
      case 'is.workflow.actions.getcurrentlocation':
        outputs.push('location');
        break;
      case 'is.workflow.actions.getcurrentweather':
        outputs.push('weather');
        break;
    }

    return { inputs, outputs };
  }

  private analyzeDependencies(shortcut: any): Array<{
    source: string;
    dependencies: string[];
    dependents: string[];
  }> {
    const dependencies: Array<{
      source: string;
      dependencies: string[];
      dependents: string[];
    }> = [];

    // Build dependency graph
    const graph = new Map<string, { dependencies: string[]; dependents: string[] }>();

    shortcut.actions.forEach((action, index) => {
      const actionId = `action_${index}`;
      const inputs = this.getActionDataFlow(action, index, shortcut.actions);
      const outputs = this.getActionDataFlow(action, index, shortcut.actions);

      // Track dependencies
      inputs.forEach(input => {
        if (!graph.has(input)) {
          graph.set(input, { dependencies: [], dependents: [] });
        }
        graph.get(input)!.dependencies.push(actionId);
      });

      outputs.forEach(output => {
        if (!graph.has(output)) {
          graph.set(output, { dependencies: [actionId], dependents: [] });
        }
        graph.get(output)!.dependents.push(actionId);
      });
    });

    // Convert graph to dependency list
    graph.forEach((deps, actionId) => {
      dependencies.push({
        source: `Action ${actionId}`,
        dependencies: deps.dependencies,
        dependents: deps.dependents
      });
    });

    return dependencies;
  }

  private analyzePermissions(shortcut: any): Array<PermissionInfo> {
    const permissions: PermissionInfo[] = [];
    const addedPermissions = new Set<string>();

    shortcut.actions.forEach((action, index) => {
      const permission = this.getActionPermission(action);
      if (permission && !addedPermissions.has(permission.permission)) {
        permissions.push({
          permission: permission.permission,
          required: true,
          reason: permission.reason,
          scope: permission.scope,
          alternative: permission.alternative
        });
        addedPermissions.add(permission.permission);
      }
    });

    return permissions;
  }

  private getActionPermission(action: any): PermissionInfo | null {
    const permissionMap: Record<string, PermissionInfo> = {
      'is.workflow.actions.notification': {
        permission: 'notification',
        required: true,
        reason: 'Required to display notifications',
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
      },
      'is.workflow.actions.speak': {
        permission: 'media',
        required: true,
        reason: 'Required for text-to-speech',
        scope: 'moderate'
      },
      'is.workflow.actions.sendemail': {
        permission: 'contacts',
        required: true,
        reason: 'Required to send emails',
        scope: 'extensive'
      },
      'is.workflow.actions.makephonecall': {
        permission: 'contacts',
        required: true,
        reason: 'Required to make phone calls',
        scope: 'extensive'
      },
      'is.workflow.actions.gethealthsample': {
        permission: 'health',
        required: true,
        reason: 'Required to access health data',
        scope: 'extensive'
      },
      'is.workflow.actions.gethomeaccessorystate': {
        permission: 'home',
        required: true,
        reason: 'Required to control HomeKit accessories',
        scope: 'extensive'
      }
    };

    return permissionMap[action.type] || null;
  }

  private analyzeIOSCompatibility(shortcut: any): {
  minimumVersion: string;
  recommendedVersion: string;
  issues: string[];
  } {
    const issues: string[] = [];

    // Check for newer features
    const newerFeatures = [
      { action: 'is.workflow.actions.imagereasoning', minVersion: 'iOS 17', name: 'Image Reasoning' },
      { action: 'is.workflow.actions.speechrecognize', minVersion: 'iOS 17', name: 'Speech Recognition' },
      { action: 'is.workflow.actions.detectlandmarks', minVersion: 'iOS 17', name: 'Landmark Detection' }
    ];

    let minVersion = 'iOS 14.0';
    newerFeatures.forEach(feature => {
      const actionFound = shortcut.actions.some((action: any) => action.type === feature.action);
      if (actionFound && feature.minVersion) {
        minVersion = feature.minVersion;
        issues.push(`${feature.name} requires iOS ${feature.minVersion}+}`);
      }
    });

    return {
      minimumVersion: minVersion,
      recommendedVersion: 'Latest iOS version',
      issues
    };
  }

  private calculateComplexity(shortcut: any): number {
    let complexity = 1;

    // Base complexity per action
    complexity += shortcut.actions.length * 0.1;

    // Add complexity for nested structures
    const nestedComplexity = this.calculateNestedComplexity(shortcut.actions);
    complexity += nestedComplexity * 0.2;

    // Add complexity for parameter complexity
    let paramComplexity = 0;
    shortcut.actions.forEach(action => {
      if (action.parameters) {
        paramComplexity += Object.keys(action.parameters).length * 0.05;
      }
    });

    return Math.round((complexity + paramComplexity) * 10) / 10;
  }

  private estimateShortcutSize(shortcut: any): number {
    try {
      const jsonSize = JSON.stringify(shortcut).length;
      return Math.round(jsonSize / 1024); // KB estimate
    } catch {
      return 5; // Default estimate
    }
  }

  private isConfigurableParameter(parameterName: string, value: any): boolean {
    const configurableParameters = [
      'message', 'title', 'body', 'url', 'timeout',
      'volume', 'speed', 'temperature'
    ];

    return configurableParameters.includes(parameterName);
  }

  private hasConfigurableParameters(action: any): boolean {
    if (!action.parameters) return false;

    return Object.keys(action.parameters).some(key =>
      this.isConfigurableParameter(key, action.parameters[key])
    );
  }
}