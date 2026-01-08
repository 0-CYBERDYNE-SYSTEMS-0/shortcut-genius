import { Agent, AgentResult } from './base/agent';
import { ResearchResult, ResearchFinding, BaseAgentConfig } from './base/agent-types';
import { WebSearchTool } from '../web-search-tool';
import { AgentLogger } from './base/agent-logger';
import fs from 'fs/promises';

interface IOSResearchInput {
  query: string;
  context?: string;
  iosVersion?: string;
  includeBetaFeatures?: boolean;
}

interface IOSResearchConfig extends BaseAgentConfig {
  webSearchTool: WebSearchTool;
  actionDatabasePath?: string;
}

export class IOSResearchAgent extends Agent<IOSResearchInput, ResearchResult> {
  private webSearchTool: WebSearchTool;
  private actionDatabasePath: string;
  private logger: AgentLogger;

  constructor(config: IOSResearchConfig) {
    super(config);
    this.webSearchTool = config.webSearchTool;
    this.actionDatabasePath = config.actionDatabasePath || '/Users/scrimwiggins/shortcut-genius-main/final-action-database.json';
    this.logger = AgentLogger.getInstance();
  }

  getAgentName(): string {
    return 'IOSResearchAgent';
  }

  validate(input: IOSResearchInput): boolean {
    return !!input?.query && typeof input.query === 'string' && input.query.length > 0;
  }

  async execute(input: IOSResearchInput): Promise<AgentResult<ResearchResult>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    this.logger.info(this.getAgentName(), `Starting research for: ${input.query}`);

    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.info(this.getAgentName(), 'Returning cached result');
        return this.createResult(cached, Date.now() - startTime, 0, true);
      }

      // Perform comprehensive research
      const result = await this.performComprehensiveResearch(input);

      // Cache the result
      this.setCachedResult(cacheKey, result, 300000); // 5 minutes cache

      const executionTime = Date.now() - startTime;
      this.logger.performance(this.getAgentName(), 'Research completed', executionTime);

      return this.createResult(result, executionTime);
    } catch (error: any) {
      this.logger.error(this.getAgentName(), `Research failed: ${error.message}`, { query: input.query });
      return this.createError(error, Date.now() - startTime);
    }
  }

  private async performComprehensiveResearch(input: IOSResearchInput): Promise<ResearchResult> {
    const findings: ResearchFinding[] = [];
    const searchQueries: string[] = [];
    const sources: Set<string> = new Set();

    // Strategy 1: Search for action-specific information
    const actionSearchResults = await this.searchForActions(input.query);
    findings.push(...actionSearchResults.findings);
    searchQueries.push(...actionSearchResults.queries);
    actionSearchResults.sources.forEach(source => sources.add(source));

    // Strategy 2: Search for iOS version-specific features
    if (input.iosVersion) {
      const versionResults = await this.searchForVersionSpecificFeatures(input.query, input.iosVersion);
      findings.push(...versionResults.findings);
      searchQueries.push(...versionResults.queries);
      versionResults.sources.forEach(source => sources.add(source));
    }

    // Strategy 3: Search for API integration information
    const apiResults = await this.searchForAPIInformation(input.query);
    findings.push(...apiResults.findings);
    searchQueries.push(...apiResults.queries);
    apiResults.sources.forEach(source => sources.add(source));

    // Strategy 4: Search action database for matches
    const dbResults = await this.searchActionDatabase(input.query);
    findings.push(...dbResults);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(findings);

    return {
      findings: findings.filter(f => f.confidence > 0.3), // Filter low-confidence results
      iosVersion: input.iosVersion || 'latest',
      searchQueries,
      totalSources: sources.size,
      confidence
    };
  }

  private async searchForActions(query: string): Promise<{
    findings: ResearchFinding[];
    queries: string[];
    sources: string[];
  }> {
    const findings: ResearchFinding[] = [];
    const queries: string[] = [];
    const sources: string[] = [];

    // Generate relevant search queries
    const searchTerms = this.generateActionSearchTerms(query);

    for (const term of searchTerms) {
      queries.push(term);

      try {
        const searchResults = await this.webSearchTool.searchForAPIDocumentation(term, 3);

        searchResults.results.forEach(result => {
          const finding = this.parseSearchResultForAction(result, query);
          if (finding) {
            findings.push(finding);
            sources.push(result.url);
          }
        });

        // If we get AI-synthesized answer, parse it too
        if ((searchResults as any).answer) {
          const answerFinding = this.parseAIAnswerForAction((searchResults as any).answer, query);
          if (answerFinding) {
            findings.push(answerFinding);
          }
        }
      } catch (error) {
        this.logger.warn(this.getAgentName(), `Search failed for term: ${term}`, { error: (error as Error).message });
      }
    }

    return { findings, queries, sources };
  }

  private async searchForVersionSpecificFeatures(query: string, iosVersion: string): Promise<{
    findings: ResearchFinding[];
    queries: string[];
    sources: string[];
  }> {
    const findings: ResearchFinding[] = [];
    const queries: string[] = [];
    const sources: string[] = [];

    const versionSpecificQueries = [
      `iOS ${iosVersion} shortcuts ${query}`,
      `${query} iOS ${iosVersion} new features`,
      `iOS ${iosVersion} API changes ${query}`,
      `${query} compatibility iOS ${iosVersion}`
    ];

    for (const query of versionSpecificQueries) {
      queries.push(query);

      try {
        const results = await this.webSearchTool.search(query, 2);

        results.results.forEach(result => {
          const finding = this.parseSearchResultForAction(result, query);
          if (finding) {
            findings.push(finding);
            sources.push(result.url);
          }
        });
      } catch (error) {
        this.logger.warn(this.getAgentName(), `Version search failed: ${query}`, { error: (error as Error).message });
      }
    }

    return { findings, queries, sources };
  }

  private async searchForAPIInformation(query: string): Promise<{
    findings: ResearchFinding[];
    queries: string[];
    sources: string[];
  }> {
    const findings: ResearchFinding[] = [];
    const queries: string[] = [];
    const sources: string[] = [];

    const apiTerms = this.extractAPITerms(query);

    for (const term of apiTerms) {
      const apiQueries = [
        `${term} API documentation`,
        `${term} REST API endpoints`,
        `${term} authentication iOS`,
        `${term} integration examples iOS`
      ];

      for (const apiQuery of apiQueries) {
        queries.push(apiQuery);

        try {
          const results = await this.webSearchTool.search(apiQuery, 2);

          results.results.forEach(result => {
            const finding = this.parseSearchResultForAPI(result, term);
            if (finding) {
              findings.push(finding);
              sources.push(result.url);
            }
          });
        } catch (error) {
          this.logger.warn(this.getAgentName(), `API search failed: ${apiQuery}`, { error: (error as Error).message });
        }
      }
    }

    return { findings, queries, sources };
  }

  private async searchActionDatabase(query: string): Promise<ResearchFinding[]> {
    try {
      const databaseContent = await fs.readFile(this.actionDatabasePath, 'utf8');
      const database = JSON.parse(databaseContent);

      const findings: ResearchFinding[] = [];
      const queryLower = query.toLowerCase();

      // Search through the action database
      Object.entries(database).forEach(([actionId, actionData]: [string, any]) => {
        if (this.actionMatchesQuery(actionData, queryLower)) {
          findings.push({
            actionId,
            actionName: actionData.name || actionId,
            description: actionData.description || `Action: ${actionData.name}`,
            sources: ['internal-action-database'],
            confidence: 0.9, // High confidence for exact matches
            parameters: actionData.parameters?.map((param: any) => ({
              name: param.key || param.name,
              type: param.type || 'string',
              required: !param.optional,
              description: param.description || `Parameter: ${param.key || param.name}`,
              defaultValue: param.default
            }))
          });
        }
      });

      return findings;
    } catch (error) {
      this.logger.warn(this.getAgentName(), 'Failed to search action database', { error: (error as Error).message });
      return [];
    }
  }

  private generateActionSearchTerms(query: string): string[] {
    const terms: string[] = [];
    const queryLower = query.toLowerCase();

    // Extract key concepts
    const concepts = this.extractConcepts(query);
    concepts.forEach(concept => {
      terms.push(`iOS Shortcut ${concept} action`);
      terms.push(`Shortcuts app ${concept}`);
      terms.push(`${concept} automation iOS`);
    });

    // Add the original query
    terms.push(query);
    terms.push(`iOS Shortcuts ${query}`);

    return [...new Set(terms)]; // Remove duplicates
  }

  private extractConcepts(query: string): string[] {
    const concepts: string[] = [];
    const queryLower = query.toLowerCase();

    // Common iOS Shortcuts concepts
    const commonConcepts = [
      'notification', 'calendar', 'weather', 'location', 'camera', 'photo',
      'music', 'spotify', 'maps', 'navigation', 'email', 'message', 'call',
      'web', 'http', 'api', 'json', 'text', 'file', 'folder', 'dictionary',
      'variable', 'repeat', 'if', 'menu', 'ask', 'input', 'output', 'script',
      'siri', 'automation', 'trigger', 'homekit', 'health', 'workout'
    ];

    commonConcepts.forEach(concept => {
      if (queryLower.includes(concept)) {
        concepts.push(concept);
      }
    });

    return concepts;
  }

  private extractAPITerms(query: string): string[] {
    const apiTerms: string[] = [];
    const queryLower = query.toLowerCase();

    // Common API indicators
    const apiPatterns = [
      'openai', 'anthropic', 'google', 'apple', 'microsoft',
      'github', 'twitter', 'facebook', 'instagram', 'slack', 'discord',
      'spotify', 'youtube', 'netflix', 'twitch',
      'weather', 'maps', 'translate', 'news', 'calendar', 'email'
    ];

    apiPatterns.forEach(term => {
      if (queryLower.includes(term)) {
        apiTerms.push(term);
      }
    });

    // Look for "API" mentions
    if (queryLower.includes('api')) {
      const words = queryLower.split(/\s+/);
      const apiIndex = words.indexOf('api');
      if (apiIndex > 0) {
        apiTerms.push(words[apiIndex - 1]);
      }
    }

    return [...new Set(apiTerms)];
  }

  private actionMatchesQuery(actionData: any, queryLower: string): boolean {
    const name = (actionData.name || '').toLowerCase();
    const description = (actionData.description || '').toLowerCase();
    const category = (actionData.category || '').toLowerCase();
    const identifier = (actionData.identifier || '').toLowerCase();

    // Check if query matches any field
    return name.includes(queryLower) ||
           description.includes(queryLower) ||
           category.includes(queryLower) ||
           identifier.includes(queryLower);
  }

  private parseSearchResultForAction(result: any, originalQuery: string): ResearchFinding | null {
    const content = result.snippet || result.content || '';
    const title = result.title || '';
    const fullContent = `${title} ${content}`.toLowerCase();
    const originalLower = originalQuery.toLowerCase();

    // Look for action identifiers or iOS Shortcuts terminology
    const actionPatterns = [
      /is\.workflow\.actions\.(\w+)/,
      /action\s+identifier/i,
      /shortcut\s+action/i,
      /ios\s+shortcuts/i
    ];

    let match = fullContent.match(/is\.workflow\.actions\.(\w+)/);
    if (match) {
      return {
        actionId: match[1],
        actionName: this.extractActionName(result),
        description: result.snippet || result.title,
        sources: [result.url],
        confidence: 0.8
      };
    }

    // If no direct action ID found, but iOS Shortcuts content exists
    if (actionPatterns.some(pattern => pattern.test(fullContent))) {
      return {
        actionId: 'discovered-' + Date.now(),
        actionName: this.extractActionName(result),
        description: result.snippet || result.title,
        sources: [result.url],
        confidence: 0.6
      };
    }

    return null;
  }

  private parseSearchResultForAPI(result: any, serviceName: string): ResearchFinding | null {
    const content = result.snippet || result.content || '';
    const title = result.title || '';
    const fullContent = `${title} ${content}`.toLowerCase();

    // Look for API documentation indicators
    const apiPatterns = [
      /api\s+documentation/i,
      /endpoints?/i,
      /authentication/i,
      /rest\s+api/i,
      /http\s+method/i,
      /json\s+response/i
    ];

    if (apiPatterns.some(pattern => pattern.test(fullContent))) {
      return {
        actionId: `api-${serviceName}`,
        actionName: `${serviceName} API Integration`,
        description: `API integration for ${serviceName}: ${title}`,
        sources: [result.url],
        confidence: 0.7
      };
    }

    return null;
  }

  private parseAIAnswerForAction(answer: string, query: string): ResearchFinding | null {
    // Try to extract action information from AI-synthesized answer
    const lines = answer.split('\n');

    for (const line of lines) {
      if (line.includes('action') || line.includes('shortcut')) {
        return {
          actionId: 'ai-synthesized',
          actionName: 'AI Resolved Action',
          description: line.trim(),
          sources: ['ai-synthesis'],
          confidence: 0.5
        };
      }
    }

    return null;
  }

  private extractActionName(result: any): string {
    // Try to extract a clean action name
    const title = result.title || '';

    // Remove common prefixes/suffixes
    const cleanName = title
      .replace(/^(iOS|Shortcut|Apple)?\s*/i, '')
      .replace(/\s*(Action|API|Documentation|Guide)$/i, '')
      .trim();

    return cleanName || 'Unknown Action';
  }

  private calculateConfidence(findings: ResearchFinding[]): number {
    if (findings.length === 0) return 0;

    // Weight confidence by source reliability
    const weights = {
      'internal-action-database': 1.0,
      'ai-synthesis': 0.6,
      'developer.apple.com': 0.9,
      'developer.apple.com/documentation': 0.95,
      'tavily': 0.7,
      'github.com': 0.8,
      'openai.com': 0.8,
      'anthropic.com': 0.8
    };

    let totalWeight = 0;
    let weightedSum = 0;

    findings.forEach(finding => {
      const sourceWeight = Math.max(...finding.sources.map(source => weights[source as keyof typeof weights] || 0.5));
      const weight = sourceWeight * finding.confidence;

      weightedSum += weight;
      totalWeight += sourceWeight;
    });

    return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1.0) : 0;
  }
}