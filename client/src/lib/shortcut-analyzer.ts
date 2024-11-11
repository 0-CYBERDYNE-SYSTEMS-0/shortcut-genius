import { Shortcut, ShortcutAction, ACTION_PERMISSIONS } from './shortcuts';

interface AnalysisResult {
  patterns: ActionPattern[];
  dependencies: DependencyNode[];
  optimizations: Optimization[];
  security: SecurityCheck[];
  permissions: PermissionCheck[];
}

interface ActionPattern {
  type: string;
  frequency: number;
  context: string;
}

interface DependencyNode {
  action: ShortcutAction;
  dependencies: string[];
  dependents: string[];
}

interface Optimization {
  type: 'performance' | 'structure' | 'safety';
  description: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

interface SecurityCheck {
  type: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
  mitigation?: string;
}

interface PermissionCheck {
  permission: string;
  required: boolean;
  reason: string;
  alternative?: string;
}

// Analyze action patterns in the shortcut
function analyzePatterns(actions: ShortcutAction[]): ActionPattern[] {
  const patterns: ActionPattern[] = [];
  const frequency: Record<string, number> = {};
  
  actions.forEach((action) => {
    frequency[action.type] = (frequency[action.type] || 0) + 1;
  });
  
  Object.entries(frequency).forEach(([type, count]) => {
    patterns.push({
      type,
      frequency: count,
      context: getActionContext(type, actions)
    });
  });
  
  return patterns;
}

// Build dependency graph
function buildDependencyGraph(actions: ShortcutAction[]): DependencyNode[] {
  const nodes: DependencyNode[] = [];
  
  actions.forEach((action, index) => {
    const dependencies = findDependencies(action, actions.slice(0, index));
    const dependents = findDependents(action, actions.slice(index + 1));
    
    nodes.push({
      action,
      dependencies,
      dependents
    });
  });
  
  return nodes;
}

// Find potential optimizations
function findOptimizations(shortcut: Shortcut): Optimization[] {
  const optimizations: Optimization[] = [];
  
  // Check for redundant actions
  const patterns = analyzePatterns(shortcut.actions);
  patterns.forEach(pattern => {
    if (pattern.frequency > 3) {
      optimizations.push({
        type: 'structure',
        description: `Repeated ${pattern.type} actions detected`,
        suggestion: 'Consider using a Repeat action or creating a sub-shortcut',
        impact: 'medium'
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
        impact: 'high'
      });
    }
  });
  
  return optimizations;
}

// Perform security analysis
function analyzeSecurity(shortcut: Shortcut): SecurityCheck[] {
  const checks: SecurityCheck[] = [];
  
  shortcut.actions.forEach(action => {
    if (action.type === 'url') {
      checks.push({
        type: 'network',
        risk: action.parameters.url.startsWith('https://') ? 'low' : 'high',
        description: 'Network request security',
        mitigation: 'Use HTTPS for all network requests'
      });
    }
    
    if (action.type === 'files') {
      checks.push({
        type: 'filesystem',
        risk: 'medium',
        description: 'File system access',
        mitigation: 'Validate file paths and limit access to necessary directories'
      });
    }
  });
  
  return checks;
}

// Analyze required permissions
function analyzePermissions(shortcut: Shortcut): PermissionCheck[] {
  const checks: PermissionCheck[] = [];
  const requiredPermissions = new Set<string>();
  
  shortcut.actions.forEach(action => {
    const permission = ACTION_PERMISSIONS[action.type as keyof typeof ACTION_PERMISSIONS];
    if (permission && permission !== 'none') {
      requiredPermissions.add(permission);
    }
  });
  
  requiredPermissions.forEach(permission => {
    checks.push({
      permission,
      required: true,
      reason: getPermissionReason(permission),
      alternative: getPermissionAlternative(permission)
    });
  });
  
  return checks;
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
  
  // Check for data dependencies
  Object.values(action.parameters).forEach(value => {
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
      const matches = value.match(/\{([^}]+)\}/g);
      matches?.forEach(match => {
        const varName = match.slice(1, -1);
        const sourceAction = previousActions.find(a => 
          a.type === 'ask' && a.parameters.prompt.toLowerCase().includes(varName.toLowerCase())
        );
        if (sourceAction) {
          dependencies.push(sourceAction.type);
        }
      });
    }
  });
  
  return dependencies;
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
  
  return dependents;
}

// Helper function to get permission reason
function getPermissionReason(permission: string): string {
  const reasons: Record<string, string> = {
    'media': 'Required for audio playback or recording',
    'camera': 'Required for taking photos',
    'photo-library': 'Required for accessing photos',
    'location': 'Required for location services',
    'health': 'Required for health data access',
    'home': 'Required for HomeKit device control',
    'notification': 'Required for sending notifications',
    'calendar': 'Required for calendar access',
    'contacts': 'Required for contacts access'
  };
  
  return reasons[permission] || 'Required for functionality';
}

// Helper function to get permission alternatives
function getPermissionAlternative(permission: string): string | undefined {
  const alternatives: Record<string, string> = {
    'location': 'Consider using manual input if precise location is not required',
    'health': 'Consider using manual tracking for non-critical data',
    'camera': 'Consider allowing photo upload instead of direct camera access',
    'notification': 'Consider using in-app alerts instead'
  };
  
  return alternatives[permission];
}

export function analyzeShortcut(shortcut: Shortcut): AnalysisResult {
  return {
    patterns: analyzePatterns(shortcut.actions),
    dependencies: buildDependencyGraph(shortcut.actions),
    optimizations: findOptimizations(shortcut),
    security: analyzeSecurity(shortcut),
    permissions: analyzePermissions(shortcut)
  };
}
