/**
 * Shared interfaces and types for all agents
 */

// Research result types
export interface ResearchFinding {
  actionId: string;
  actionName: string;
  description: string;
  sources: string[];
  confidence: number;
  parameters?: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface ResearchResult {
  findings: ResearchFinding[];
  iosVersion: string;
  searchQueries: string[];
  totalSources: number;
  confidence: number;
}

// Validation result types
export interface ValidationError {
  type: 'structure' | 'parameter' | 'dependency' | 'permission' | 'compatibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  action?: string;
}

export interface ValidationWarning {
  type: 'optimization' | 'security' | 'performance' | 'best-practice';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  impact: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  permissions: PermissionInfo[];
  score: number; // 0-100
}

export interface PermissionInfo {
  permission: string;
  required: boolean;
  reason: string;
  alternative?: string;
  scope: 'minimal' | 'moderate' | 'extensive';
}

// Security analysis types
export interface SecurityVulnerability {
  cweId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-10
  mitigation: string;
  references: string[];
}

export interface DataFlowAnalysis {
  sourceAction: string;
  dataTypes: string[];
  destinationActions: string[];
  transformations: string[];
  vulnerabilities: SecurityVulnerability[];
}

export interface SecurityReport {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallScore: number; // 0-100
  vulnerabilities: SecurityVulnerability[];
  dataFlows: DataFlowAnalysis[];
  recommendations: string[];
  complianceIssues: ComplianceIssue[];
}

export interface ComplianceIssue {
  framework: string; // OWASP, NIST, etc.
  requirement: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  description: string;
  remediation: string;
}

// Optimization types
export interface OptimizationSuggestion {
  type: 'performance' | 'structure' | 'maintainability' | 'reusability' | 'security';
  category: string;
  description: string;
  currentIssue: string;
  suggestedChange: string;
  estimatedImpact: string;
  automatable: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface CodePattern {
  type: string;
  name: string;
  description: string;
  frequency: number;
  locations: number[];
  refactoringOpportunity: boolean;
  suggestedImprovement: string;
}

export interface ReusableComponent {
  id: string;
  name: string;
  description: string;
  actions: any[];
  inputs: string[];
  outputs: string[];
  parameters: ParameterInfo[];
  usageCount: number;
}

export interface OptimizationReport {
  overallScore: number; // 0-100
  suggestions: OptimizationSuggestion[];
  patterns: CodePattern[];
  reusableComponents: ReusableComponent[];
  estimatedImprovements: {
    performance?: string;
    maintainability?: string;
    security?: string;
  };
}

// Documentation types
export interface UsageExample {
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  prerequisites: string[];
}

export interface TroubleshootingItem {
  problem: string;
  symptoms: string[];
  causes: string[];
  solutions: string[];
  prevention: string[];
}

export interface DocumentationOutput {
  usageGuide: string;
  technicalSpec: string;
  examples: UsageExample[];
  troubleshooting: TroubleshootingItem[];
  format: 'markdown' | 'html' | 'json';
  lastUpdated: Date;
}

// Agent orchestration types
export interface AgentTask {
  id: string;
  agentType: string;
  input: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  timeout?: number;
  retries?: number;
}

export interface AgentTaskResult {
  taskId: string;
  agentType: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  metadata?: any;
}

export interface OrchestrationStrategy {
  mode: 'parallel' | 'sequential' | 'conditional';
  agents: string[];
  conditions?: string[]; // for conditional mode
  aggregationMethod?: 'merge' | 'chain' | 'select-best' | 'all';
  failurePolicy: 'continue' | 'stop' | 'retry';
}

export interface OrchestrationResult {
  strategy: OrchestrationStrategy;
  results: AgentTaskResult[];
  success: boolean;
  aggregatedResult?: any;
  errors: string[];
  totalExecutionTime: number;
}

// Common agent configuration
export interface BaseAgentConfig {
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
  cacheTTL?: number;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

// Error types
export class AgentError extends Error {
  public code: string;
  public recoverable: boolean;
  public context?: any;

  constructor(code: string, message: string, recoverable: boolean = false, context?: any) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
  }
}

// Utility types
export type AgentType =
  | 'ios-research'
  | 'shortcut-validator'
  | 'security-analyzer'
  | 'optimizer'
  | 'documentation';

export type PhaseType =
  | 'research'
  | 'validation'
  | 'security'
  | 'optimization'
  | 'documentation'
  | 'analysis';