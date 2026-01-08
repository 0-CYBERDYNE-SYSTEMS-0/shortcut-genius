import { Agent, AgentResult } from './base/agent';
import { SecurityReport, SecurityVulnerability, DataFlowAnalysis, ComplianceIssue, BaseAgentConfig } from './base/agent-types';
import { AgentLogger } from './base/agent-logger';

interface SecurityAnalysisInput {
  shortcut: any;
  strictMode?: boolean;
  includeComplianceChecks?: boolean;
  targetStandards?: ('OWASP' | 'NIST' | 'CIS')[];
}

interface SecurityConfig extends BaseAgentConfig {
  cweDatabase?: Record<string, any>;
}

export class SecurityAnalyzerAgent extends Agent<SecurityAnalysisInput, SecurityReport> {
  private cweDatabase: Record<string, any>;
  private logger: AgentLogger;

  constructor(config: SecurityConfig = {}) {
    super(config);
    this.cweDatabase = config.cweDatabase || this.getDefaultCWEDatabase();
    this.logger = AgentLogger.getInstance();
  }

  getAgentName(): string {
    return 'SecurityAnalyzerAgent';
  }

  validate(input: SecurityAnalysisInput): boolean {
    return !!input?.shortcut && typeof input.shortcut === 'object';
  }

  async execute(input: SecurityAnalysisInput): Promise<AgentResult<SecurityReport>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    this.logger.info(this.getAgentName(), `Analyzing security for shortcut: ${input.shortcut.name || 'Unnamed'}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info(this.getAgentName(), 'Returning cached security analysis');
        return this.createResult(cached, Date.now() - startTime, 0, true);
      }

      // Perform comprehensive security analysis
      const report = await this.performSecurityAnalysis(input);

      // Cache the result
      this.setCachedResult(cacheKey, report, 120000); // 2 minutes cache

      const executionTime = Date.now() - startTime;
      this.logger.performance(this.getAgentName(), 'Security analysis completed', executionTime);

      return this.createResult(report, executionTime);
    } catch (error: any) {
      this.logger.error(this.getAgentName(), `Security analysis failed: ${error.message}`, { shortcut: input.shortcut.name });
      return this.createError(error, Date.now() - startTime);
    }
  }

  private async performSecurityAnalysis(input: SecurityAnalysisInput): Promise<SecurityReport> {
    const { shortcut, strictMode = false, includeComplianceChecks = true, targetStandards = ['OWASP'] } = input;

    const vulnerabilities: SecurityVulnerability[] = [];
    const dataFlows: DataFlowAnalysis[] = [];
    const complianceIssues: ComplianceIssue[] = [];

    // Phase 1: Data Flow Analysis
    const dataFlowAnalysis = this.analyzeDataFlow(shortcut);
    dataFlows.push(...dataFlowAnalysis);
    vulnerabilities.push(...dataFlowAnalysis.flatMap(flow => flow.vulnerabilities));

    // Phase 2: Action Security Analysis
    const actionSecurityAnalysis = this.analyzeActionSecurity(shortcut);
    vulnerabilities.push(...actionSecurityAnalysis);

    // Phase 3: Parameter Security Analysis
    const parameterSecurityAnalysis = this.analyzeParameterSecurity(shortcut);
    vulnerabilities.push(...parameterSecurityAnalysis);

    // Phase 4: Network Security Analysis
    const networkSecurityAnalysis = this.analyzeNetworkSecurity(shortcut);
    vulnerabilities.push(...networkSecurityAnalysis);

    // Phase 5: Permission Security Analysis
    const permissionSecurityAnalysis = this.analyzePermissionSecurity(shortcut);
    vulnerabilities.push(...permissionSecurityAnalysis);

    // Phase 6: Compliance Analysis
    if (includeComplianceChecks) {
      targetStandards.forEach(standard => {
        const complianceAnalysis = this.analyzeCompliance(shortcut, standard);
        complianceIssues.push(...complianceAnalysis);
      });
    }

    // Calculate risk scores
    const { riskLevel, overallScore } = this.calculateRiskScores(vulnerabilities);

    // Generate recommendations
    const recommendations = this.generateRecommendations(vulnerabilities, dataFlows);

    return {
      riskLevel,
      overallScore,
      vulnerabilities,
      dataFlows,
      recommendations,
      complianceIssues
    };
  }

  private analyzeDataFlow(shortcut: any): DataFlowAnalysis[] {
    const dataFlows: DataFlowAnalysis[] = [];
    const variableMap = new Map<string, { sources: string[]; destinations: string[]; types: string[] }>();

    // Analyze each action for data flow
    const analyzeActionForDataFlow = (action: any, path: string[] = [], index: number = 0) => {
      const actionPath = path.concat([`${index + 1}. ${action.type}`]);

      // Track input data types
      const inputDataTypes = this.getActionInputDataTypes(action);

      // Track output data types
      const outputDataTypes = this.getActionOutputDataTypes(action);

      // Find data transformations
      const transformations = this.detectDataTransformations(action);

      // Check for security vulnerabilities in data flow
      const vulnerabilities = this.analyzeActionDataFlowSecurity(action, inputDataTypes, outputDataTypes);

      // Update variable tracking
      inputDataTypes.forEach(dataType => {
        if (!variableMap.has(dataType)) {
          variableMap.set(dataType, { sources: [], destinations: [], types: [] });
        }
        const existing = variableMap.get(dataType)!;
        existing.sources.push(actionPath.join(' -> '));
        existing.types.push(...( transformations.length > 0 ? transformations : ['string']));
      });

      outputDataTypes.forEach(dataType => {
        if (!variableMap.has(dataType)) {
          variableMap.set(dataType, { sources: [], destinations: [], types: [] });
        }
        const existing = variableMap.get(dataType)!;
        existing.destinations.push(actionPath.join(' -> '));
        existing.types.push(...( transformations.length > 0 ? transformations : ['string']));
      });

      // Recursively analyze nested actions
      if (action.type === 'if') {
        if (action.parameters?.then) {
          action.parameters.then.forEach((nestedAction: any, i: number) => {
            if (typeof nestedAction === 'object') {
              analyzeActionForDataFlow(nestedAction, actionPath.concat(['then']), i);
            }
          });
        }
        if (action.parameters?.else) {
          action.parameters.else.forEach((nestedAction: any, i: number) => {
            if (typeof nestedAction === 'object') {
              analyzeActionForDataFlow(nestedAction, actionPath.concat(['else']), i);
            }
          });
        }
      }

      if (action.type === 'repeat') {
        if (action.parameters?.actions) {
          action.parameters.actions.forEach((nestedAction: any, i: number) => {
            if (typeof nestedAction === 'object') {
              analyzeActionForDataFlow(nestedAction, actionPath.concat(['repeat']), i);
            }
          });
        }
      }
    };

    shortcut.actions.forEach((action, index) => {
      analyzeActionForDataFlow(action, [], index);
    });

    // Create DataFlowAnalysis objects
    variableMap.forEach((flow, dataType) => {
      dataFlows.push({
        sourceAction: flow.sources[0] || 'Unknown',
        dataTypes: flow.types,
        destinationActions: flow.destinations,
        transformations: this.detectDataTransformations(shortcut),
        vulnerabilities: []
      });
    });

    return dataFlows;
  }

  private getActionInputDataTypes(action: any): string[] {
    const dataTypes: string[] = [];

    if (action.parameters) {
      Object.values(action.parameters).forEach(value => {
        if (typeof value === 'string') {
          // Check for variable references
          const variableRefs = value.match(/\{([^}]+)\}/g);
          if (variableRefs) {
            dataTypes.push(...variableRefs.map(ref => ref.slice(1, -1)));
          } else {
            dataTypes.push('string');
          }
        } else if (typeof value === 'number') {
          dataTypes.push('number');
        } else if (typeof value === 'boolean') {
          dataTypes.push('boolean');
        } else if (Array.isArray(value)) {
          dataTypes.push('array');
        } else if (typeof value === 'object') {
          dataTypes.push('object');
        }
      });
    }

    return dataTypes;
  }

  private getActionOutputDataTypes(action: any): string[] {
    const dataTypes: string[] = [];

    // Based on action type, determine expected output
    switch (action.type) {
      case 'is.workflow.actions.gettext':
      case 'is.workflow.actions.getvariable':
      case 'is.workflow.actions.ask':
      case 'is.workflow.actions.getcurrentlocation':
      case 'is.workflow.actions.getcurrentweather':
      case 'is.workflow.actions.getclipboard':
        dataTypes.push('string');
        break;
      case 'is.workflow.actions.calculate':
        dataTypes.push('number');
        break;
      case 'is.workflow.actions.getfile':
        dataTypes.push('file');
        break;
      case 'is.workflow.actions.getlatestphotos':
        dataTypes.push('image');
        break;
      default:
        // Unknown action, assume string output
        dataTypes.push('unknown');
    }

    return dataTypes;
  }

  private detectDataTransformations(action: any): string[] {
    const transformations: string[] = [];

    // Check for specific transformation patterns
    if (action.type === 'is.workflow.actions.formatnumber' ||
        action.type === 'is.workflow.actions.formatdate') {
      transformations.push('formatting');
    }

    if (action.type === 'is.workflow.actions.text' ||
        action.type === 'is.workflow.actions.combinetext' ||
        action.type === 'is.workflow.actions.replacetext') {
      transformations.push('text_manipulation');
    }

    return transformations;
  }

  private analyzeActionDataFlowSecurity(action: any, inputDataTypes: string[], outputDataTypes: string[]): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for unsafe data transformations
    if (this.hasUnsafeDataTransformations(action)) {
      vulnerabilities.push({
        cweId: 'CWE-94',
        title: 'Improper Control of Generation of Code',
        description: `Action ${action.type} performs unsafe data transformations`,
        severity: 'medium',
        likelihood: 'possible',
        impact: 'medium',
        riskScore: 5,
        mitigation: 'Validate all data transformations and sanitize inputs',
        references: ['https://cwe.mitre.org/data/definitions/94.html']
      });
    }

    // Check for injection vulnerabilities
    if (this.hasInjectionVulnerability(action)) {
      vulnerabilities.push({
        cweId: 'CWE-89',
        title: 'Improper Neutralization of Special Elements',
        description: `Action ${action.type} may be vulnerable to injection attacks`,
        severity: 'high',
        likelihood: 'possible',
        impact: 'high',
        riskScore: 8,
        mitigation: 'Sanitize all user inputs and use parameterized queries',
        references: ['https://cwe.mitre.org/data/definitions/89.html']
      });
    }

    return vulnerabilities;
  }

  private analyzeActionSecurity(shortcut: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    shortcut.actions.forEach((action, index) => {
      // Check for hardcoded secrets
      if (this.hasHardcodedSecrets(action)) {
        vulnerabilities.push({
          cweId: 'CWE-798',
          title: 'Use of Hard-coded Credentials',
          description: `Action ${index + 1} contains hardcoded secrets`,
          severity: 'critical',
          likelihood: 'certain',
          impact: 'critical',
          riskScore: 9,
          mitigation: 'Use environment variables or secure storage for secrets',
          references: ['https://cwe.mitre.org/data/definitions/798.html']
        });
      }

      // Check for insecure network communications
      if (this.hasInsecureNetworkCommunication(action)) {
        vulnerabilities.push({
          cweId: 'CWE-319',
          title: 'Cleartext Transmission of Sensitive Information',
          description: `Action ${index + 1} may transmit data insecurely`,
          severity: 'high',
          likelihood: 'possible',
          impact: 'high',
          riskScore: 7,
          mitigation: 'Use HTTPS/TLS for all network communications',
          references: ['https://cwe.mitre.org/data/definitions/319.html']
        });
      }

      // Check for file system security issues
      if (this.hasFileSystemSecurityIssues(action)) {
        vulnerabilities.push({
          cweId: 'CWE-22',
          title: 'Improper Limitation of a Pathname to a Restricted Directory',
          description: `Action ${index + 1} may access files insecurely`,
          severity: 'medium',
          likelihood: 'possible',
          impact: 'medium',
          riskScore: 5,
          mitigation: 'Validate file paths and restrict access to necessary directories',
          references: ['https://cwe.mitre.org/data/definitions/22.html']
        });
      }
    });

    return vulnerabilities;
  }

  private analyzeParameterSecurity(shortcut: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    shortcut.actions.forEach((action, index) => {
      if (!action.parameters) return;

      Object.entries(action.parameters).forEach(([paramName, paramValue]) => {
        // Check for sensitive data in parameters
        if (this.containsSensitiveData(paramValue)) {
          vulnerabilities.push({
            cweId: 'CWE-200',
            title: 'Exposure of Sensitive Information to an Unauthorized Actor',
            description: `Action ${index + 1} parameter "${paramName}" may contain sensitive information`,
            severity: 'medium',
            likelihood: 'possible',
            impact: 'medium',
            riskScore: 4,
            mitigation: 'Encrypt sensitive data or avoid storing it in parameters',
            references: ['https://cwe.mitre.org/data/definitions/200.html']
          });
        }

        // Check for unsafe string operations
        if (typeof paramValue === 'string' && this.hasUnsafeStringOperations(paramValue)) {
          vulnerabilities.push({
            cweId: 'CWE-1333',
            title: 'Improper Neutralization of Special Elements',
            description: `Action ${index + 1} parameter "${paramName}" performs unsafe string operations`,
            severity: 'medium',
            likelihood: 'possible',
            impact: 'medium',
            riskScore: 4,
            mitigation: 'Use proper string sanitization libraries',
            references: ['https://cwe.mitre.org/data/1333.html']
          });
        }
      });
    });

    return vulnerabilities;
  }

  private analyzeNetworkSecurity(shortcut: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    shortcut.actions.forEach((action, index) => {
      // Check for URL actions
      if (action.type === 'is.workflow.actions.url' && action.parameters?.url) {
        const url = action.parameters.url;

        if (typeof url === 'string') {
          // Check for HTTP instead of HTTPS
          if (url.startsWith('http://')) {
            vulnerabilities.push({
              cweId: 'CWE-319',
              title: 'Cleartext Transmission of Sensitive Information',
              description: `Action ${index + 1} uses insecure HTTP protocol`,
              severity: 'high',
              likelihood: 'certain',
              impact: 'high',
              riskScore: 8,
              mitigation: 'Use HTTPS for all network communications',
              references: ['https://cwe.mitre.org/data/definitions/319.html']
            });
          }

          // Check for suspicious URLs
          if (this.isSuspiciousURL(url)) {
            vulnerabilities.push({
              cweId: 'CWE-200',
              title: 'Exposure of Sensitive Information to an Unauthorized Actor',
              description: `Action ${index + 1} accesses suspicious URL: ${url}`,
              severity: 'high',
              likelihood: 'possible',
              impact: 'high',
              riskScore: 7,
              mitigation: 'Verify URL safety and use allowlist approach',
              references: ['https://cwe.mitre.org/data/definitions/200.html']
            });
          }
        }
      }

      // Check for content extraction from URLs
      if (action.type === 'is.workflow.actions.getcontentsofurl') {
        vulnerabilities.push({
          cweId: 'CWE-200',
          title: 'Exposure of Sensitive Information to an Unauthorized Actor',
          description: `Action ${index + 1} extracts content from URLs - potential security risk`,
          severity: 'medium',
          likelihood: 'possible',
          impact: 'medium',
          riskScore: 5,
          mitigation: 'Validate content sources and implement content filtering',
          references: ['https://cwe.mitre.org/data/definitions/200.html']
        });
      }
    });

    return vulnerabilities;
  }

  private analyzePermissionSecurity(shortcut: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const requestedPermissions = new Set<string>();

    // Collect all requested permissions
    shortcut.actions.forEach((action, index) => {
      const permission = this.getActionPermission(action);
      if (permission) {
        requestedPermissions.add(permission);
      }
    });

    // Check for excessive permissions
    if (requestedPermissions.size > 5) {
      vulnerabilities.push({
        cweId: 'CWE-250',
        title: 'Execution with Unnecessary Privileges',
        description: `Shortcut requests ${requestedPermissions.size} permissions - may be excessive`,
        severity: 'medium',
        likelihood: 'possible',
        impact: 'medium',
        riskScore: 4,
        mitigation: 'Review permissions and request only what is necessary',
        references: ['https://cwe.mitre.org/data/definitions/250.html']
      });
    }

    // Check for sensitive permissions
    const sensitivePermissions = ['contacts', 'health', 'home', 'photos'];
    const hasSensitivePermission = Array.from(requestedPermissions).some(perm =>
      sensitivePermissions.some(sensitive => perm.toLowerCase().includes(sensitive))
    );

    if (hasSensitivePermission) {
      vulnerabilities.push({
        cweId: 'CWE-250',
        title: 'Execution with Unnecessary Privileges',
        description: `Shortcut requests sensitive permissions: ${Array.from(requestedPermissions).join(', ')}`,
        severity: 'medium',
        likelihood: 'possible',
        impact: 'medium',
        riskScore: 5,
        mitigation: 'Consider if all sensitive permissions are truly necessary',
        references: ['https://cwe.mitre.org/data/definitions/250.html']
      });
    }

    return vulnerabilities;
  }

  private analyzeCompliance(shortcut: any, standard: 'OWASP' | 'NIST' | 'CIS'): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    switch (standard) {
      case 'OWASP':
        issues.push(...this.analyzeOWASPCompliance(shortcut));
        break;
      case 'NIST':
        issues.push(...this.analyzeNISTCompliance(shortcut));
        break;
      case 'CIS':
        issues.push(...this.analyzeCISCompliance(shortcut));
        break;
    }

    return issues;
  }

  private analyzeOWASPCompliance(shortcut: any): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // OWASP Mobile Top 10
    const owaspChecks = [
      {
        requirement: 'M1: Improper Platform Usage',
        check: () => this.checkOWASPM1(shortcut)
      },
      {
        requirement: 'M2: Insecure Data Storage',
        check: () => this.checkOWASPM2(shortcut)
      },
      {
        requirement: 'M3: Insecure Authentication',
        check: () => this.checkOWASPM3(shortcut)
      },
      {
        requirement: 'M4: Insecure Data Transfer',
        check: () => this.checkOWASPM4(shortcut)
      },
      {
        requirement: 'M5: Poor Authorization and Session Management',
        check: () => this.checkOWASPM5(shortcut)
      },
      {
        requirement: 'M6: Insecure Cryptographic Storage',
        check: () => this.checkOWASPM6(shortcut)
      },
      {
        requirement: 'M7: Client Code Quality',
        check: () => this.checkOWASPM7(shortcut)
      },
      {
        requirement: 'M8: Code Tampering',
        check: () => this.checkOWASPM8(shortcut)
      },
      {
        requirement: 'M9: Reverse Engineering',
        check: () => this.checkOWASPM9(shortcut)
      },
      {
        requirement: 'M10: Extraneous Functionality',
        check: () => this.checkOWASPM10(shortcut)
      }
    ];

    owaspChecks.forEach(({ requirement, check }) => {
      const result = check();
      if (result.status !== 'compliant') {
        issues.push({
          framework: 'OWASP Mobile',
          requirement,
          status: result.status,
          description: result.description,
          remediation: result.remediation
        });
      }
    });

    return issues;
  }

  private checkOWASPM1(shortcut: any): { status: string; description: string; remediation: string } {
    // Check for proper iOS Shortcuts usage
    const urlActions = shortcut.actions.filter((action: any) => action.type === 'is.workflow.actions.url');
    const insecureUrls = urlActions.filter((action: any) =>
      action.parameters?.url?.startsWith('http://')
    );

    if (insecureUrls.length > 0) {
      return {
        status: 'partial',
        description: 'Some actions use insecure HTTP protocol',
        remediation: 'Use HTTPS for all network communications'
      };
    }

    return { status: 'compliant', description: 'Proper platform usage', remediation: '' };
  }

  private checkOWASPM2(shortcut: any): { status: string; description: string; remediation: string } {
    // Check for sensitive data handling
    const sensitiveDataFound = this.containsSensitiveData(shortcut);

    if (sensitiveDataFound) {
      return {
        status: 'partial',
        description: 'Shortcut may handle sensitive data insecurely',
        remediation: 'Encrypt sensitive data and use secure storage'
      };
    }

    return { status: 'compliant', description: 'No sensitive data storage issues detected', remediation: '' };
  }

  private checkOWASPM3(shortcut: any): { status: string; description: string; remediation: string } {
    // Check for authentication mechanisms
    const authActions = shortcut.actions.filter((action: any) =>
      action.type === 'is.workflow.actions.getclipboard' ||
      action.type === 'is.workflow.actions.ask'
    );

    if (authActions.length === 0) {
      return {
        status: 'non-compliant',
        description: 'Shortcut lacks authentication mechanisms',
        remediation: 'Consider adding user authentication or input validation'
      };
    }

    return { status: 'compliant', description: 'Authentication mechanisms present', remediation: '' };
  }

  private checkOWASPM4(shortcut: any): { status: string; description: string; remediation: string } {
    // Check for secure data transfer
    const dataTransferActions = shortcut.actions.filter((action: any) =>
      action.type === 'is.workflow.actions.url' ||
      action.type === 'is.workflow.actions.getcontentsofurl'
    );

    const insecureTransfers = dataTransferActions.filter((action: any) =>
      action.parameters?.url?.startsWith('http://')
    );

    if (insecureTransfers.length > 0) {
      return {
        status: 'partial',
        description: 'Some data transfers use insecure protocols',
        remediation: 'Use HTTPS for all data transfers'
      };
    }

    return { status: 'compliant', description: 'Data transfers use secure protocols', remediation: '' };
  }

  private checkOWASPM5(shortcut: any): { status: string; description: string; remediation: string } {
    return { status: 'compliant', description: 'iOS Shortcuts manages sessions automatically', remediation: '' };
  }

  private checkOWASPM6(shortcut: any): { status: string; description: string; remediation: string } {
    return { status: 'compliant', description: 'iOS provides secure key storage', remediation: '' };
  }

  private checkOWASPM7(shortcut: any): { status: string; description: string; remediation: string } {
    // Check code quality indicators
    const complexity = this.calculateComplexity(shortcut);

    if (complexity > 8) {
      return {
        status: 'partial',
        description: `Shortcut has high complexity score (${complexity}/10)`,
        remediation: 'Consider breaking down into smaller, more maintainable shortcuts'
      };
    }

    return { status: 'compliant', description: 'Code quality is acceptable', remediation: '' };
  }

  private checkOWASPM8(shortcut: any): { status: string; description: string; remediation: string } {
    return { status: 'compliant', description: 'iOS Shortcuts are protected by code signing', remediation: '' };
  }

  private checkOWASPM9(shortcut: any): { status: string; description: string; remediation: string } {
    return { status: 'compliant', description: 'iOS Shortcuts provide obfuscation through code signing', remediation: '' };
  }

  private checkOWASPM10(shortcut:): { status: string; description: string; remediation: string } {
    const nonEssentialActions = ['is.workflow.actions.showresult', 'is.workflow.actions.nothing'];
    const nonEssentialCount = shortcut.actions.filter((action: any) =>
      nonEssentialActions.includes(action.type)
    ).length;

    if (nonEssentialCount > shortcut.actions.length * 0.3) {
      return {
        status: 'warning',
        description: 'Shortcut contains many non-essential actions',
        remediation: 'Remove unnecessary actions to reduce attack surface'
      };
    }

    return { status: 'compliant', description: 'Shortcut functionality is focused and essential', remediation: '' };
  }

  private analyzeNISTCompliance(shortcut: any): ComplianceIssue[] {
    return []; // Implement NIST-specific checks
  }

  private analyzeCISCompliance(shortcut: any): ComplianceIssue[] {
    return []; // Implement CIS-specific checks
  }

  private hasHardcodedSecrets(action: any): boolean {
    if (!action.parameters) return false;

    const secretPatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key\s*[:=]/i,
      /api[_-]?key/i,
      /auth[_-]?token/i,
      /bearer\s+[a-z0-9\-._]+/i
    ];

    return Object.values(action.parameters).some(value =>
      typeof value === 'string' && secretPatterns.some(pattern => pattern.test(value))
    );
  }

  private hasInsecureNetworkCommunication(action: any): boolean {
    if (action.type === 'is.workflow.actions.url' && action.parameters?.url) {
      const url = action.parameters.url;
      return typeof url === 'string' && !url.startsWith('https://');
    }
    return false;
  }

  private hasFileSystemSecurityIssues(action: any): boolean {
    if (action.type === 'is.workflow.actions.savefile' && action.parameters?.file_path) {
      const path = action.parameters.file_path;
      return typeof path === 'string' && (
        path.includes('../') ||
        path.includes('..\\') ||
        path.startsWith('/') ||
        path.includes('~')
      );
    }
    return false;
  }

  private hasInjectionVulnerability(action: any): boolean {
    if (!action.parameters) return false;

    // Check for dynamic URL construction
    if (action.type === 'is.workflow.actions.url' && action.parameters?.url) {
      const url = action.parameters.url;
      return typeof url === 'string' && url.includes('{');
    }

    return false;
  }

  private hasUnsafeDataTransformations(action: any): boolean {
    return action.type === 'is.workflow.actions.evalscript' ||
           action.type === 'is.workflow.actions.runjavascript';
  }

  private hasUnsafeStringOperations(value: string): boolean {
    const unsafePatterns = [
      /eval\(/i,
      /exec\(/i,
      /Function\(/i,
      /setTimeout\(/i,
      /setInterval\(/i
    ];

    return unsafePatterns.some(pattern => pattern.test(value));
  }

  private containsSensitiveData(data: any): boolean {
    if (typeof data !== 'string') return false;

    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /credential/i,
      /auth/i,
      /session/i,
      /cookie/i,
      /bearer/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(data));
  }

  private isSuspiciousURL(url: string): boolean {
    const suspiciousPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/,
      /192\.168\./,
      /10\.0\.0\./,
      /bit\.ly/,
      /tinyurl\.com/,
      /goo\.gl/,
      /shortened/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  private getActionPermission(action: any): string | null {
    const permissionMap: Record<string, string> = {
      'is.workflow.actions.notification': 'notification',
      'is.workflow.actions.getcurrentlocation': 'location',
      'is.workflow.actions.takephoto': 'camera',
      'is.workflow.actions.selectphotos': 'photo-library',
      'is.workflow.actions.getdeviceinfo': 'device',
      'is.workflow.actions.setvolume': 'device',
      'is.workflow.actions.getfile': 'filesystem',
      'is.workflow.actions.savefile': 'filesystem',
      'is.workflow.actions.sendemail': 'contacts',
      'is.workflow.actions.makephonecall': 'contacts',
      'is.workflow.actions.gethealthsample': 'health',
      'is.workflow.actions.gethomeaccessorystate': 'home',
      'is.workflow.actions.speak': 'media'
    };

    return permissionMap[action.type] || null;
  }

  private calculateComplexity(shortcut: any): number {
    let complexity = 1; // Base complexity

    // Add complexity for each action
    complexity += shortcut.actions.length * 0.1;

    // Add complexity for nested actions
    shortcut.actions.forEach((action: any) => {
      if (action.type === 'if') {
        if (action.parameters?.then) {
          complexity += (action.parameters.then?.length || 0) * 0.2;
        }
        if (action.parameters?.else) {
          complexity += (action.parameters.else?.length || 0) * 0.2;
        }
      }

      if (action.type === 'repeat') {
        complexity += (action.parameters?.actions?.length || 0) * 0.15;
      }

      // Add complexity for complex parameter structures
      if (action.parameters) {
        const paramComplexity = Object.keys(action.parameters).length * 0.05;
        complexity += paramComplexity;
      }
    });

    return Math.min(Math.round(complexity * 10) / 10, 10);
  }

  private calculateRiskScores(vulnerabilities: SecurityVulnerability[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    overallScore: number;
  } {
    if (vulnerabilities.length === 0) {
      return { riskLevel: 'low', overallScore: 100 };
    }

    // Calculate risk based on severity and likelihood
    let totalRiskScore = 0;
    let maxRiskScore = 0;

    vulnerabilities.forEach(vuln => {
      const riskScore = vuln.riskScore;
      totalRiskScore += riskScore;
      maxRiskScore = Math.max(maxRiskScore, riskScore);
    });

    const averageRiskScore = totalRiskScore / vulnerabilities.length;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (maxRiskScore >= 9 || averageRiskScore >= 7) {
      riskLevel = 'critical';
    } else if (maxRiskScore >= 7 || averageRiskScore >= 5) {
      riskLevel = 'high';
    } else if (maxRiskScore >= 5 || averageRiskScore >= 3) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Calculate overall score (0-100)
    const overallScore = Math.max(0, 100 - (averageRiskScore * 10));

    return { riskLevel, overallScore };
  }

  private generateRecommendations(vulnerabilities: SecurityVulnerability[], dataFlows: DataFlowAnalysis[]): string[] {
    const recommendations: string[] = [];

    // Group vulnerabilities by type
    const vulnByType = new Map<string, SecurityVulnerability[]>();
    vulnerabilities.forEach(vuln => {
      if (!vulnByType.has(vuln.cweId)) {
        vulnByType.set(vuln.cweId, []);
      }
      vulnByType.get(vuln.cweId)!.push(vuln);
    });

    // Generate recommendations for each vulnerability type
    vulnByType.forEach((vulns, cweId) => {
      const mitigationCounts = new Map<string, number>();
      vulns.forEach(vuln => {
        mitigationCounts.set(vuln.mitigation, (mitigationCounts.get(vuln.mitigation) || 0) + 1);
      });

      // Get most common mitigation for this CWE
      const mostCommonMitigation = Array.from(mitigationCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      if (mitigationCounts.get(mostCommonMitigation)! > 1) {
        recommendations.push(`Address ${vulns[0].cweId}: ${mostCommonMitigation} (${mitigationCounts.get(mostCommonMitigation)} occurrences)`);
      }
    });

    // Add general security recommendations
    if (vulnerabilities.length > 0) {
      recommendations.push('Implement comprehensive input validation and sanitization');
      recommendations.push('Use secure coding practices and follow iOS Shortcuts security guidelines');
      recommendations.push('Regular security testing and code review');
    }

    // Add data flow security recommendations
    if (dataFlows.length > 0) {
      recommendations.push('Validate all data transformations and maintain data integrity');
      recommendations.push('Implement proper error handling for data flow failures');
    }

    return recommendations;
  }

  private getDefaultCWEDatabase(): Record<string, any> {
    return {
      'CWE-89': {
        title: 'Improper Neutralization of Special Elements',
        description: 'The software does not neutralize or incorrectly neutralizes user-controllable input before using it.',
        severity: 'High'
      },
      'CWE-94': {
        title: 'Improper Control of Generation of Code',
        description: 'The software constructs all or part of a code segment using externally-influenced input.',
        severity: 'High'
      },
      'CWE-200': {
        title: 'Exposure of Sensitive Information to an Unauthorized Actor',
        description: 'The software exposes sensitive information to an actor that is not authorized to access it.',
        severity: 'Medium'
      },
      'CWE-319': {
        title: 'Cleartext Transmission of Sensitive Information',
        description: 'The software transmits sensitive data in cleartext within an unprotected channel.',
        severity: 'High'
      }
    };
  }
}