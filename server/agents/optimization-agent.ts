import { Agent, AgentResult } from './base/agent';
import { OptimizationReport, OptimizationSuggestion, CodePattern, ReusableComponent, BaseAgentConfig } from './base/agent-types';
import { AgentLogger } from './base/agent-logger';

interface OptimizationInput {
  shortcut: any;
  optimizationLevel?: 'basic' | 'aggressive';
  targetGoals?: ('performance' | 'maintainability' | 'reusability' | 'security')[];
}

export class OptimizationAgent extends Agent<OptimizationInput, OptimizationReport> {
  private logger: AgentLogger;

  constructor(config: BaseAgentConfig = {}) {
    super(config);
    this.logger = AgentLogger.getInstance();
  }

  getAgentName(): string {
    return 'OptimizationAgent';
  }

  validate(input: OptimizationInput): boolean {
    return !!input?.shortcut && typeof input.shortcut === 'object';
  }

  async execute(input: OptimizationInput): Promise<AgentResult<OptimizationReport>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    this.logger.info(this.getAgentName(), `Optimizing shortcut: ${input.shortcut.name || 'Unnamed'}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info(this.getAgentName(), 'Returning cached optimization result');
        return this.createResult(cached, Date.now() - startTime, 0, true);
      }

      // Perform optimization analysis
      const report = await this.performOptimization(input);

      // Cache the result
      this.setCachedResult(cacheKey, report, 90000); // 1.5 minutes cache

      const executionTime = Date.now() - startTime;
      this.logger.performance(this.getAgentName(), 'Optimization completed', executionTime);

      return this.createResult(report, executionTime);
    } catch (error: any) {
      this.logger.error(this.getAgentName(), `Optimization failed: ${error.message}`, { shortcut: input.shortcut.name });
      return this.createError(error, Date.now() - startTime);
    }
  }

  private async performOptimization(input: OptimizationInput): Promise<OptimizationReport> {
    const { shortcut, optimizationLevel = 'basic', targetGoals = ['performance', 'maintainability'] } = input;

    const suggestions: OptimizationSuggestion[] = [];
    const patterns: CodePattern[] = [];
    const reusableComponents: ReusableComponent[] = [];

    // Phase 1: Pattern Detection
    const detectedPatterns = this.detectPatterns(shortcut);
    patterns.push(...detectedPatterns);

    // Phase 2: Optimization Analysis
    if (targetGoals.includes('performance')) {
      const performanceOptimizations = this.analyzePerformance(shortcut, optimizationLevel);
      suggestions.push(...performanceOptimizations);
    }

    if (targetGoals.includes('maintainability')) {
      const maintainabilityOptimizations = this.analyzeMaintainability(shortcut, optimizationLevel);
      suggestions.push(...maintainabilityOptimizations);
    }

    if (targetGoals.includes('reusability')) {
      const reusabilityOptimizations = this.analyzeReusability(shortcut, optimizationLevel);
      suggestions.push(...reusabilityOptimizations);
      const components = this.extractReusableComponents(shortcut);
      reusableComponents.push(...components);
    }

    // Calculate overall score
    const overallScore = this.calculateOptimizationScore(shortcut, suggestions);

    return {
      overallScore,
      suggestions,
      patterns,
      reusableComponents,
      estimatedImprovements: this.calculateEstimatedImprovements(suggestions)
    };
  }

  private detectPatterns(shortcut: any): CodePattern[] {
    const patterns: CodePattern[] = [];
    const actionCount = shortcut.actions.length;

    // Detect repeated action sequences
    const sequences = this.findRepeatedSequences(shortcut.actions);
    sequences.forEach((sequence, index) => {
      if (sequence.frequency > 1) {
        patterns.push({
          type: 'repeated_sequence',
          name: `Repeated Action Sequence ${index + 1}`,
          description: `Sequence of ${sequence.actions.length} actions repeated ${sequence.frequency} times`,
          frequency: sequence.frequency,
          locations: sequence.locations,
          refactoringOpportunity: true,
          suggestedImprovement: 'Replace with repeat action or reusable component'
        });
      }
    });

    // Detect similar parameter values
    const parameterPatterns = this.findParameterPatterns(shortcut.actions);
    parameterPatterns.forEach((pattern, index) => {
      patterns.push({
        type: 'parameter_pattern',
        name: `Parameter Pattern ${index + 1}`,
        description: `${pattern.frequency} actions use similar parameter values`,
        frequency: pattern.frequency,
        locations: pattern.locations,
        refactoringOpportunity: true,
        suggestedImprovement: 'Use variables or constants for repeated values'
      });
    });

    // Detect complexity patterns
    if (actionCount > 10) {
      patterns.push({
        type: 'complexity',
        name: 'High Complexity Shortcut',
        description: `Shortcut contains ${actionCount} actions, suggesting high complexity`,
        frequency: 1,
        locations: [0],
        refactoringOpportunity: actionCount > 15,
        suggestedImprovement: 'Consider breaking into multiple simpler shortcuts'
      });
    }

    return patterns;
  }

  private findRepeatedSequences(actions: any[]): {
    actions: any[];
    frequency: number;
    locations: number[];
  }[] {
    const sequences: any[] = [];

    // Look for sequences of 2-4 consecutive actions
    for (let length = 2; length <= 4; length++) {
      for (let start = 0; start <= actions.length - length; start++) {
        const sequence = actions.slice(start, start + length);
        const sequenceString = JSON.stringify(sequence);

        // Count occurrences of this sequence
        let frequency = 0;
        const locations: number[] = [];

        for (let pos = 0; pos <= actions.length - length; pos++) {
          const candidateSequence = actions.slice(pos, pos + length);
          if (JSON.stringify(candidateSequence) === sequenceString) {
            frequency++;
            locations.push(pos);
          }
        }

        if (frequency > 1) {
          sequences.push({
            actions: sequence,
            frequency,
            locations: locations.slice(0, frequency) // Remove duplicates
          });
        }
      }
    }

    return sequences;
  }

  private findParameterPatterns(actions: any[]): {
    frequency: number;
    locations: number[];
  }[] {
    const patterns: any[] = [];
    const parameterMap = new Map<string, { count: number; locations: number[] }>();

    actions.forEach((action, index) => {
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length > 3) {
            const mapKey = `${key}:${value}`;
            if (!parameterMap.has(mapKey)) {
              parameterMap.set(mapKey, { count: 0, locations: [] });
            }
            const entry = parameterMap.get(mapKey)!;
            entry.count++;
            entry.locations.push(index);
          }
        });
      }
    });

    parameterMap.forEach((value, key) => {
      if (value.count > 1) {
        patterns.push({
          frequency: value.count,
          locations: value.locations
        });
      }
    });

    return patterns;
  }

  private analyzePerformance(shortcut: any, optimizationLevel: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for inefficient action usage
    shortcut.actions.forEach((action, index) => {
      // Check for unnecessary wait actions
      if (action.type === 'is.workflow.actions.wait') {
        const waitTime = action.parameters?.seconds || 1;
        if (waitTime > 5) {
          suggestions.push({
            type: 'performance',
            category: 'wait_optimization',
            description: `Long wait action (${waitTime}s) may impact performance`,
            currentIssue: `Action ${index + 1} waits ${waitTime}s`,
            suggestedChange: 'Consider if shorter wait or async processing is needed',
            estimatedImpact: 'Improves responsiveness',
            automatable: false,
            complexity: 'simple'
          });
        }
      }

      // Check for redundant notifications
      if (action.type === 'is.workflow.actions.notification') {
        const similarNotifications = shortcut.actions.filter((a: any, i: number) =>
          i !== index && a.type === 'is.workflow.actions.notification'
        );

        if (similarNotifications.length > 2) {
          suggestions.push({
            type: 'performance',
            category: 'notification_optimization',
            description: 'Multiple notification actions may create redundancy',
            currentIssue: `${similarNotifications.length + 1} notification actions found`,
            suggestedChange: 'Consolidate notifications or reduce frequency',
            estimatedImpact: 'Reduces user interruption',
            automatable: true,
            complexity: 'moderate'
          });
        }
      }
    });

    // Check for complex nested structures
    const nestedComplexity = this.calculateNestedComplexity(shortcut.actions);
    if (nestedComplexity > 3) {
      suggestions.push({
        type: 'performance',
        category: 'nesting_optimization',
        description: `Deep nesting (${nestedComplexity} levels) may impact readability and performance`,
        currentIssue: `Nested complexity score: ${nestedComplexity}`,
        suggestedChange: 'Flatten nested structures or extract to separate actions',
        estimatedImpact: 'Improves maintainability and potentially performance',
        automatable: false,
        complexity: 'complex'
      });
    }

    return suggestions;
  }

  private analyzeMaintainability(shortcut: any, optimizationLevel: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for hardcoded values
    const hardcodedValues = this.findHardcodedValues(shortcut);
    if (hardcodedValues.length > 0) {
      suggestions.push({
        type: 'maintainability',
        category: 'hardcoded_values',
        description: 'Hardcoded values reduce maintainability',
        currentIssue: `${hardcodedValues.length} hardcoded values found`,
        suggestedChange: 'Use variables or user input for configurable values',
        estimatedImpact: 'Makes shortcut more flexible and maintainable',
        automatable: true,
        complexity: 'simple'
      });
    }

    // Check for lack of comments/documentation
    const commentActions = shortcut.actions.filter((a: any) => a.type === 'is.workflow.actions.comment');
    if (commentActions.length === 0 && shortcut.actions.length > 5) {
      suggestions.push({
        type: 'maintainability',
        category: 'documentation',
        description: 'Shortcut lacks documentation for maintainability',
        currentIssue: 'No comment actions found in complex shortcut',
        suggestedChange: 'Add comment actions to explain complex logic',
        estimatedImpact: 'Improves understanding and maintainability',
        automatable: false,
        complexity: 'simple'
      });
    }

    // Check for error handling
    const errorHandlingActions = shortcut.actions.filter((a: any) =>
      a.type === 'is.workflow.actions.if' && a.parameters?.condition
    );

    if (errorHandlingActions.length === 0 && shortcut.actions.length > 3) {
      suggestions.push({
        type: 'maintainability',
        category: 'error_handling',
        description: 'Shortcut lacks error handling',
        currentIssue: 'No conditional checks for potential failures',
        suggestedChange: 'Add conditional checks for actions that may fail',
        estimatedImpact: 'Improves reliability and user experience',
        automatable: false,
        complexity: 'moderate'
      });
    }

    return suggestions;
  }

  private analyzeReusability(shortcut: any, optimizationLevel: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for self-contained components
    const components = this.extractReusableComponents(shortcut);
    if (components.length > 0) {
      suggestions.push({
        type: 'reusability',
        category: 'component_extraction',
        description: 'Shortcut contains reusable components',
        currentIssue: `${components.length} potential reusable components identified`,
        suggestedChange: 'Extract components for reuse in other shortcuts',
        estimatedImpact: 'Reduces duplication and increases efficiency',
        automatable: true,
        complexity: 'complex'
      });
    }

    // Check for parameterized actions
    const parameterizedActions = this.findParameterizedActions(shortcut);
    if (parameterizedActions.length > 2) {
      suggestions.push({
        type: 'reusability',
        category: 'parameterization',
        description: 'Multiple actions could benefit from parameterization',
        currentIssue: `${parameterizedActions.length} actions with similar structures`,
        suggestedChange: 'Create parameterized templates for common action patterns',
        estimatedImpact: 'Enables reuse and reduces development time',
        automatable: true,
        complexity: 'moderate'
      });
    }

    return suggestions;
  }

  private calculateNestedComplexity(actions: any[]): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const calculateDepth = (actionList: any[]): void => {
      actionList.forEach(action => {
        if (action.type === 'if' || action.type === 'repeat') {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);

          if (action.type === 'if') {
            if (action.parameters?.then) {
              calculateDepth(action.parameters.then);
            }
            if (action.parameters?.else) {
              calculateDepth(action.parameters.else);
            }
          }

          if (action.type === 'repeat' && action.parameters?.actions) {
            calculateDepth(action.parameters.actions);
          }

          currentDepth--;
        }
      });
    };

    calculateDepth(actions);
    return maxDepth;
  }

  private findHardcodedValues(shortcut: any): any[] {
    const hardcodedValues: any[] = [];

    shortcut.actions.forEach((action, index) => {
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && this.isHardcodedValue(value)) {
            hardcodedValues.push({
              actionIndex: index,
              parameter: key,
              value: value,
              suggestion: `Use variable instead of hardcoded "${value}"`
            });
          }
        });
      }
    });

    return hardcodedValues;
  }

  private isHardcodedValue(value: string): boolean {
    // Common hardcoded patterns that should be parameterized
    const hardcodedPatterns = [
      /^Hello World$/i,
      /^test/i,
      /^example/i,
      /^temp/i,
      /^[a-zA-Z0-9]{20,}$/ // Long random strings
    ];

    return hardcodedPatterns.some(pattern => pattern.test(value));
  }

  private extractReusableComponents(shortcut: any): ReusableComponent[] {
    const components: ReusableComponent[] = [];

    // Look for common action sequences that could be components
    const sequences = this.findRepeatedSequences(shortcut.actions);
    sequences.forEach((sequence, index) => {
      if (sequence.frequency >= 2) {
        const inputs = this.extractComponentInputs(sequence.actions);
        const outputs = this.extractComponentOutputs(sequence.actions);

        components.push({
          id: `component_${index}`,
          name: `Reusable Component ${index + 1}`,
          description: `A sequence of ${sequence.actions.length} actions that could be reused`,
          actions: sequence.actions,
          inputs,
          outputs,
          parameters: this.extractComponentParameters(sequence.actions),
          usageCount: sequence.frequency
        });
      }
    });

    return components;
  }

  private extractComponentInputs(actions: any[]): string[] {
    const inputs = new Set<string>();

    actions.forEach(action => {
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('{')) {
            // This is likely a variable reference (input)
            inputs.add(key);
          }
        });
      }
    });

    return Array.from(inputs);
  }

  private extractComponentOutputs(actions: any[]): string[] {
    const outputs = new Set<string>();

    // Based on action types, determine expected outputs
    actions.forEach(action => {
      switch (action.type) {
        case 'is.workflow.actions.gettext':
        case 'is.workflow.actions.getvariable':
        case 'is.workflow.actions.ask':
          outputs.add('string');
          break;
        case 'is.workflow.actions.calculate':
          outputs.add('number');
          break;
        case 'is.workflow.actions.getfile':
          outputs.add('file');
          break;
        case 'is.workflow.actions.getlatestphotos':
          outputs.add('image');
          break;
      }
    });

    return Array.from(outputs);
  }

  private extractComponentParameters(actions: any[]): any[] {
    const parameters = new Set<string>();

    actions.forEach(action => {
      if (action.parameters) {
        Object.keys(action.parameters).forEach(key => {
          parameters.add(key);
        });
      }
    });

    return Array.from(parameters).map(param => ({
      name: param,
      type: 'string', // Default type
      required: true,
      description: `Parameter: ${param}`
    }));
  }

  private findParameterizedActions(shortcut: any[]): any[] {
    const actionGroups = new Map<string, any[]>();

    shortcut.actions.forEach((action, index) => {
      const key = `${action.type}:${Object.keys(action.parameters || {}).sort().join(',')}`;
      if (!actionGroups.has(key)) {
        actionGroups.set(key, []);
      }
      actionGroups.get(key)!.push({ action, index });
    });

    const parameterizedActions = [];
    actionGroups.forEach((group, key) => {
      if (group.length > 2) {
        parameterizedActions.push({
          actionType: key.split(':')[0],
          parameters: key.split(':')[1].split(',').filter(p => p),
          occurrences: group.length,
          indices: group.map(g => g.index)
        });
      }
    });

    return parameterizedActions;
  }

  private calculateOptimizationScore(shortcut: any, suggestions: OptimizationSuggestion[]): number {
    let score = 100; // Start with perfect score

    // Deduct points for each suggestion
    suggestions.forEach(suggestion => {
      switch (suggestion.complexity) {
        case 'simple':
          score -= 2;
          break;
        case 'moderate':
          score -= 5;
          break;
        case 'complex':
          score -= 10;
          break;
      }

      // Additional deduction for high-impact suggestions
      if (suggestion.estimatedImpact.includes('improves')) {
        score -= 1;
      }
    });

    // Ensure score doesn't go below 0
    return Math.max(0, Math.round(score));
  }

  private calculateEstimatedImprovements(suggestions: OptimizationSuggestion[]): {
    performance?: string;
    maintainability?: string;
    security?: string;
  } {
    const improvements: any = {};

    const performanceSuggestions = suggestions.filter(s => s.category.includes('performance'));
    const maintainabilitySuggestions = suggestions.filter(s => s.category.includes('maintainability'));
    const securitySuggestions = suggestions.filter(s => s.category.includes('security'));

    if (performanceSuggestions.length > 0) {
      improvements.performance = 'Up to 30% performance improvement expected';
    }

    if (maintainabilitySuggestions.length > 0) {
      improvements.maintainability = 'Significant maintainability improvements';
    }

    if (securitySuggestions.length > 0) {
      improvements.security = 'Enhanced security posture';
    }

    return improvements;
  }
}