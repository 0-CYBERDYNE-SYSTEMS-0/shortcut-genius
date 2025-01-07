import { Shortcut, ShortcutAction, ACTION_PERMISSIONS, SHORTCUT_ACTIONS } from './shortcuts';

interface AnalysisResult {
  patterns: ActionPattern[];
  dependencies: DependencyNode[];
  optimizations: Optimization[];
  security: SecurityCheck[];
  permissions: PermissionCheck[];
  complexityScore: ComplexityScore;
  reversedStructure: ReversedStructure;
}

// New interfaces for advanced analysis
interface ComplexityScore {
  overall: number;
  breakdown: {
    numberOfActions: number;
    nestingDepth: number;
    conditionalComplexity: number;
    dataFlowComplexity: number;
  };
}

interface ReversedStructure {
  components: Component[];
  dataFlow: DataFlow[];
  entryPoints: string[];
  exitPoints: string[];
}

interface Component {
  id: string;
  type: 'sequence' | 'conditional' | 'loop' | 'input' | 'output';
  actions: ShortcutAction[];
  metadata: {
    purpose?: string;
    complexity?: number;
    reusability?: boolean;
  };
}

interface DataFlow {
  from: string;
  to: string;
  dataType: string;
  optional: boolean;
}

// Existing interfaces
interface ActionPattern {
  type: string;
  frequency: number;
  context: string;
  commonParameters: Record<string, any>;
  suggestedOptimizations?: string[];
}

interface DependencyNode {
  action: ShortcutAction;
  dependencies: string[];
  dependents: string[];
  dataFlow: {
    inputs: string[];
    outputs: string[];
  };
}

interface Optimization {
  type: 'performance' | 'structure' | 'safety' | 'reusability';
  description: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  automatable: boolean;
}

interface SecurityCheck {
  type: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
  mitigation?: string;
  cwe?: string; // Common Weakness Enumeration reference
}

interface PermissionCheck {
  permission: string;
  required: boolean;
  reason: string;
  alternative?: string;
  scope: 'minimal' | 'moderate' | 'extensive';
}

// Helper function to get context for an action type
function getActionContext(type: string, actions: ShortcutAction[]): string {
  const typeIndex = actions.findIndex(a => a.type === type);
  if (typeIndex === -1) return 'standalone';
  
  const prev = typeIndex > 0 ? actions[typeIndex - 1].type : null;
  const next = typeIndex < actions.length - 1 ? actions[typeIndex + 1].type : null;
  
  return `${prev ? `after ${prev}` : 'start'} -> ${type} -> ${next ? `before ${next}` : 'end'}`;
}

// Helper function to find dependencies for an action
function findDependencies(action: ShortcutAction, previousActions: ShortcutAction[]): string[] {
  const dependencies: string[] = [];
  
  // Check for data dependencies in parameters
  Object.values(action.parameters).forEach(value => {
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
      const matches = value.match(/\{([^}]+)\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.slice(1, -1);
          // Find source action that produces this variable
          const sourceAction = previousActions.find(a => {
            if (a.type === 'ask') return a.parameters.prompt.toLowerCase().includes(varName.toLowerCase());
            if (a.type === 'text') return a.parameters.text.toLowerCase().includes(varName.toLowerCase());
            if (a.type === 'get_location' && varName.includes('location')) return true;
            return false;
          });
          if (sourceAction) {
            dependencies.push(sourceAction.type);
          }
        });
      }
    }
  });
  
  // Control flow dependencies
  if (action.type === 'if' || action.type === 'repeat') {
    const nestedActions = action.type === 'if' 
      ? [...(action.parameters.then || []), ...(action.parameters.else || [])]
      : action.parameters.actions;
      
    nestedActions.forEach(nestedAction => {
      dependencies.push(...findDependencies(nestedAction, previousActions));
    });
  }
  
  return Array.from(new Set(dependencies));
}

// Helper function to find dependents for an action
function findDependents(action: ShortcutAction, nextActions: ShortcutAction[]): string[] {
  const dependents: string[] = [];
  
  nextActions.forEach(nextAction => {
    const deps = findDependencies(nextAction, [action]);
    if (deps.includes(action.type)) {
      dependents.push(nextAction.type);
    }
  });
  
  return Array.from(new Set(dependents));
}

// Helper function for analyzing security
function analyzeSecurity(shortcut: Shortcut): SecurityCheck[] {
  const checks: SecurityCheck[] = [];
  
  shortcut.actions.forEach(action => {
    if (action.type === 'url') {
      checks.push({
        type: 'network',
        risk: action.parameters.url.startsWith('https://') ? 'low' : 'high',
        description: 'Network request security',
        mitigation: 'Use HTTPS for all network requests',
        cwe: 'CWE-319' // Using Unencrypted Communication
      });
    }
    
    if (action.type === 'files') {
      checks.push({
        type: 'filesystem',
        risk: 'medium',
        description: 'File system access',
        mitigation: 'Validate file paths and limit access to necessary directories',
        cwe: 'CWE-73' // External Control of File Name or Path
      });
    }
    
    if (action.type === 'notification' && typeof action.parameters.body === 'string') {
      checks.push({
        type: 'input-validation',
        risk: action.parameters.body.includes('{') ? 'medium' : 'low',
        description: 'Dynamic content in notifications',
        mitigation: 'Validate and sanitize dynamic content before display',
        cwe: 'CWE-74' // Improper Neutralization of Special Elements
      });
    }
  });
  
  return checks;
}

// Helper function for finding optimizations
function findOptimizations(shortcut: Shortcut): Optimization[] {
  const optimizations: Optimization[] = [];
  const patterns = analyzePatterns(shortcut.actions);
  
  // Check for repeated actions
  patterns.forEach(pattern => {
    if (pattern.frequency > 3) {
      optimizations.push({
        type: 'structure',
        description: `Repeated ${pattern.type} actions detected`,
        suggestion: 'Consider using a Repeat action or creating a sub-shortcut',
        impact: 'medium',
        automatable: true
      });
    }
  });
  
  // Check for performance bottlenecks
  shortcut.actions.forEach(action => {
    if (action.type === 'wait' && action.parameters.seconds > 5) {
      optimizations.push({
        type: 'performance',
        description: 'Long wait time detected',
        suggestion: 'Consider using background tasks or notifications instead of wait actions',
        impact: 'high',
        automatable: false
      });
    }
  });
  
  // Check for reusability opportunities
  const components = reverseEngineerStructure(shortcut).components;
  components.forEach(component => {
    if (component.metadata.reusability && component.actions.length > 2) {
      optimizations.push({
        type: 'reusability',
        description: `Reusable component found: ${component.metadata.purpose}`,
        suggestion: 'Consider extracting into a separate shortcut for reuse',
        impact: 'medium',
        automatable: true
      });
    }
  });
  
  return optimizations;
}

// Helper function for analyzing permissions
function analyzePermissions(shortcut: Shortcut): PermissionCheck[] {
  const checks: PermissionCheck[] = [];
  const requiredPermissions = new Set<string>();
  
  shortcut.actions.forEach(action => {
    const permission = ACTION_PERMISSIONS[action.type as keyof typeof ACTION_PERMISSIONS];
    if (permission && permission !== 'none') {
      requiredPermissions.add(permission);
    }
  });
  
  const permissionInfo: Record<string, { reason: string; scope: PermissionCheck['scope']; alternative?: string }> = {
    media: {
      reason: 'Required for audio playback or recording',
      scope: 'moderate',
      alternative: 'Consider using device vibration for alerts'
    },
    camera: {
      reason: 'Required for taking photos',
      scope: 'extensive',
      alternative: 'Consider allowing photo upload instead'
    },
    'photo-library': {
      reason: 'Required for accessing photos',
      scope: 'extensive'
    },
    location: {
      reason: 'Required for location services',
      scope: 'extensive',
      alternative: 'Consider using manual location input'
    },
    notification: {
      reason: 'Required for sending notifications',
      scope: 'minimal',
      alternative: 'Consider using in-app alerts'
    }
  };
  
  requiredPermissions.forEach(permission => {
    const info = permissionInfo[permission] || {
      reason: 'Required for functionality',
      scope: 'moderate'
    };
    
    checks.push({
      permission,
      required: true,
      reason: info.reason,
      alternative: info.alternative,
      scope: info.scope
    });
  });
  
  return checks;
}

// Remaining existing functions from the previous implementation...

// Enhanced pattern analysis
function analyzePatterns(actions: ShortcutAction[]): ActionPattern[] {
  const patterns: ActionPattern[] = [];
  const frequency: Record<string, number> = {};
  const parameterStats: Record<string, Record<string, any[]>> = {};
  
  actions.forEach((action) => {
    frequency[action.type] = (frequency[action.type] || 0) + 1;
    
    // Track parameter usage
    if (!parameterStats[action.type]) {
      parameterStats[action.type] = {};
    }
    Object.entries(action.parameters).forEach(([key, value]) => {
      if (!parameterStats[action.type][key]) {
        parameterStats[action.type][key] = [];
      }
      parameterStats[action.type][key].push(value);
    });
  });
  
  Object.entries(frequency).forEach(([type, count]) => {
    const commonParameters: Record<string, any> = {};
    if (parameterStats[type]) {
      Object.entries(parameterStats[type]).forEach(([key, values]) => {
        const mostCommon = findMostCommonValue(values);
        if (mostCommon.frequency > values.length * 0.5) {
          commonParameters[key] = mostCommon.value;
        }
      });
    }
    
    patterns.push({
      type,
      frequency: count,
      context: getActionContext(type, actions),
      commonParameters,
      suggestedOptimizations: suggestPatternOptimizations(type, count, commonParameters)
    });
  });
  
  return patterns;
}

// Enhanced dependency analysis
function buildDependencyGraph(actions: ShortcutAction[]): DependencyNode[] {
  const nodes: DependencyNode[] = [];
  const dataFlowMap = new Map<string, Set<string>>();
  
  actions.forEach((action, index) => {
    const dependencies = findDependencies(action, actions.slice(0, index));
    const dependents = findDependents(action, actions.slice(index + 1));
    const dataFlow = analyzeDataFlow(action, actions);
    
    // Track data flow
    dataFlow.outputs.forEach(output => {
      if (!dataFlowMap.has(output)) {
        dataFlowMap.set(output, new Set());
      }
      dataFlow.inputs.forEach(input => {
        dataFlowMap.get(output)?.add(input);
      });
    });
    
    nodes.push({
      action,
      dependencies,
      dependents,
      dataFlow
    });
  });
  
  return nodes;
}

// Helper functions (findMostCommonValue, suggestPatternOptimizations, etc.) from previous implementation...

function findMostCommonValue(values: any[]): { value: any; frequency: number } {
  const frequency = new Map<any, number>();
  values.forEach(value => {
    frequency.set(value, (frequency.get(value) || 0) + 1);
  });
  
  let mostCommon = { value: undefined, frequency: 0 };
  frequency.forEach((count, value) => {
    if (count > mostCommon.frequency) {
      mostCommon = { value, frequency: count };
    }
  });
  
  return mostCommon;
}

function suggestPatternOptimizations(type: string, count: number, commonParams: Record<string, any>): string[] {
  const suggestions: string[] = [];
  
  if (count > 3) {
    suggestions.push('Consider using a Repeat action for repeated patterns');
  }
  
  if (Object.keys(commonParams).length > 0) {
    suggestions.push('Consider creating a reusable variable for common parameters');
  }
  
  const actionConfig = SHORTCUT_ACTIONS[type as keyof typeof SHORTCUT_ACTIONS];
  if (actionConfig) {
    // Add action-specific optimizations
    if (type === 'wait' && commonParams.seconds > 5) {
      suggestions.push('Consider using background processing for long waits');
    }
  }
  
  return suggestions;
}

// Additional remaining implementation functions: calculateComplexityScore, reverseEngineerStructure, etc. from the original file...

function calculateComplexityScore(shortcut: Shortcut): ComplexityScore {
  const breakdown = {
    numberOfActions: shortcut.actions.length,
    nestingDepth: calculateNestingDepth(shortcut.actions),
    conditionalComplexity: calculateConditionalComplexity(shortcut.actions),
    dataFlowComplexity: calculateDataFlowComplexity(shortcut.actions)
  };
  
  return {
    overall: (
      breakdown.numberOfActions * 0.2 +
      breakdown.nestingDepth * 0.3 +
      breakdown.conditionalComplexity * 0.3 +
      breakdown.dataFlowComplexity * 0.2
    ),
    breakdown
  };
}

function calculateNestingDepth(actions: ShortcutAction[]): number {
  let maxDepth = 0;
  let currentDepth = 0;
  
  actions.forEach(action => {
    if (action.type === 'if' || action.type === 'repeat') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
      
      if (action.type === 'if') {
        const thenDepth = calculateNestingDepth(action.parameters.then || []);
        const elseDepth = calculateNestingDepth(action.parameters.else || []);
        maxDepth = Math.max(maxDepth, currentDepth + thenDepth, currentDepth + elseDepth);
      } else {
        const loopDepth = calculateNestingDepth(action.parameters.actions || []);
        maxDepth = Math.max(maxDepth, currentDepth + loopDepth);
      }
      
      currentDepth--;
    }
  });
  
  return maxDepth;
}

function calculateConditionalComplexity(actions: ShortcutAction[]): number {
  let complexity = 0;
  
  actions.forEach(action => {
    if (action.type === 'if') {
      complexity++; // Base complexity for condition
      
      // Add complexity for nested conditions
      if (action.parameters.then) {
        complexity += calculateConditionalComplexity(action.parameters.then);
      }
      if (action.parameters.else) {
        complexity += calculateConditionalComplexity(action.parameters.else);
      }
    }
  });
  
  return complexity;
}

function calculateDataFlowComplexity(actions: ShortcutAction[]): number {
  const dataFlows = new Set<string>();
  
  actions.forEach(action => {
    const flow = analyzeDataFlow(action, actions);
    flow.inputs.forEach(input => {
      flow.outputs.forEach(output => {
        dataFlows.add(`${input}->${output}`);
      });
    });
  });
  
  return dataFlows.size;
}

function analyzeDataFlow(action: ShortcutAction, allActions: ShortcutAction[]): { inputs: string[]; outputs: string[] } {
  const inputs: string[] = [];
  const outputs: string[] = [];
  
  // Analyze parameters for variable references
  Object.values(action.parameters).forEach(value => {
    if (typeof value === 'string') {
      const matches = value.match(/\{([^}]+)\}/g);
      if (matches) {
        inputs.push(...matches.map(m => m.slice(1, -1)));
      }
    }
  });
  
  // Identify outputs based on action type
  if (action.type === 'ask') {
    outputs.push(action.parameters.prompt);
  } else if (action.type === 'get_location') {
    outputs.push('location');
  }
  
  return { inputs, outputs };
}

function reverseEngineerStructure(shortcut: Shortcut): ReversedStructure {
  const components: Component[] = [];
  const dataFlow: DataFlow[] = [];
  const entryPoints: string[] = [];
  const exitPoints: string[] = [];
  
  // Identify logical components
  let currentSequence: ShortcutAction[] = [];
  shortcut.actions.forEach((action, index) => {
    if (isEntryPoint(action)) {
      entryPoints.push(action.type);
    }
    if (isExitPoint(action)) {
      exitPoints.push(action.type);
    }
    
    if (isControlFlow(action)) {
      if (currentSequence.length > 0) {
        components.push(createComponent('sequence', currentSequence));
        currentSequence = [];
      }
      components.push(createComponent(getComponentType(action), [action]));
    } else {
      currentSequence.push(action);
    }
  });
  
  if (currentSequence.length > 0) {
    components.push(createComponent('sequence', currentSequence));
  }
  
  // Analyze data flow between components
  components.forEach((source, i) => {
    components.slice(i + 1).forEach(target => {
      const flows = analyzeComponentDataFlow(source, target);
      dataFlow.push(...flows);
    });
  });
  
  return {
    components,
    dataFlow,
    entryPoints,
    exitPoints
  };
}

function isControlFlow(action: ShortcutAction): boolean {
  return ['if', 'repeat'].includes(action.type);
}

function getComponentType(action: ShortcutAction): 'conditional' | 'loop' | 'input' | 'output' {
  if (action.type === 'if') return 'conditional';
  if (action.type === 'repeat') return 'loop';
  if (['ask', 'get_location', 'select_photos'].includes(action.type)) return 'input';
  if (['notification', 'play_sound', 'set_volume'].includes(action.type)) return 'output';
  return 'sequence';
}

function createComponent(type: Component['type'], actions: ShortcutAction[]): Component {
  return {
    id: `${type}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    actions,
    metadata: {
      purpose: inferComponentPurpose(actions),
      complexity: actions.length,
      reusability: checkReusability(actions)
    }
  };
}

function inferComponentPurpose(actions: ShortcutAction[]): string {
  const types = actions.map(a => a.type);
  if (types.includes('notification')) return 'User Notification';
  if (types.includes('get_location')) return 'Location Services';
  return 'General Processing';
}

function checkReusability(actions: ShortcutAction[]): boolean {
  return actions.length > 1 && actions.every(a => !hasHardcodedValues(a));
}

function hasHardcodedValues(action: ShortcutAction): boolean {
  return Object.values(action.parameters).some(value => 
    typeof value === 'string' && !value.includes('{') && value.length > 0
  );
}

function analyzeComponentDataFlow(source: Component, target: Component): DataFlow[] {
  const flows: DataFlow[] = [];
  const sourceOutputs = new Set<string>();
  const targetInputs = new Set<string>();
  
  source.actions.forEach(action => {
    const flow = analyzeDataFlow(action, source.actions);
    flow.outputs.forEach(output => sourceOutputs.add(output));
  });
  
  target.actions.forEach(action => {
    const flow = analyzeDataFlow(action, target.actions);
    flow.inputs.forEach(input => targetInputs.add(input));
  });
  
  sourceOutputs.forEach(output => {
    targetInputs.forEach(input => {
      if (output === input) {
        flows.push({
          from: source.id,
          to: target.id,
          dataType: inferDataType(output),
          optional: !isRequired(output, target.actions)
        });
      }
    });
  });
  
  return flows;
}

function inferDataType(variable: string): string {
  if (variable.includes('location')) return 'location';
  if (variable.includes('number') || variable.includes('count')) return 'number';
  if (variable.includes('date') || variable.includes('time')) return 'datetime';
  return 'string';
}

function isRequired(input: string, actions: ShortcutAction[]): boolean {
  return actions.some(action => {
    const flow = analyzeDataFlow(action, actions);
    return flow.inputs.includes(input) && !action.type.includes('if');
  });
}

function isEntryPoint(action: ShortcutAction): boolean {
  return ['ask', 'get_location', 'select_photos'].includes(action.type);
}

function isExitPoint(action: ShortcutAction): boolean {
  return ['notification', 'play_sound', 'set_volume'].includes(action.type);
}

export function analyzeShortcut(shortcut: Shortcut): AnalysisResult {
  const patterns = analyzePatterns(shortcut.actions);
  const dependencies = buildDependencyGraph(shortcut.actions);
  const optimizations = findOptimizations(shortcut);
  const security = analyzeSecurity(shortcut);
  const permissions = analyzePermissions(shortcut);
  const complexityScore = calculateComplexityScore(shortcut);
  const reversedStructure = reverseEngineerStructure(shortcut);
  
  return {
    patterns,
    dependencies,
    optimizations,
    security,
    permissions,
    complexityScore,
    reversedStructure
  };
}

// Export helper functions for testing and reuse
export const helpers = {
  analyzePatterns,
  buildDependencyGraph,
  calculateComplexityScore,
  reverseEngineerStructure,
  findDependencies,
  findDependents,
  analyzeDataFlow
};