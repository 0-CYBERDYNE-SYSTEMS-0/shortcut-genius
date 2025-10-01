import { WebSearchTool, ExtractResult, CrawlResult } from './web-search-tool';

export interface APIDocumentation {
  name: string;
  description: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  authentication: AuthenticationInfo;
  examples: CodeExample[];
  additionalInfo: string;
  sourceUrls: string[];
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters: Parameter[];
  headers?: Record<string, string>;
  bodySchema?: any;
  responseSchema?: any;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  location: 'query' | 'path' | 'header' | 'body';
  example?: any;
}

export interface AuthenticationInfo {
  type: 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic';
  description: string;
  apiKeyLocation?: 'header' | 'query';
  apiKeyName?: string;
  oauth2Url?: string;
  scopes?: string[];
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
}

export class APIDocumentationExtractor {
  private webSearchTool: WebSearchTool;

  constructor(webSearchTool: WebSearchTool) {
    this.webSearchTool = webSearchTool;
  }

  async extractAPIDocumentation(
    serviceName: string,
    searchQuery?: string
  ): Promise<APIDocumentation> {
    const query = searchQuery || `${serviceName} API documentation endpoints parameters examples`;

    console.log(`🔍 Extracting API documentation for: ${serviceName}`);

    // Step 1: Search for API documentation
    const searchResults = await this.webSearchTool.searchForAPIDocumentation(query, 5);

    if (searchResults.results.length === 0) {
      throw new Error(`No API documentation found for ${serviceName}`);
    }

    // Step 2: Extract detailed content from the best documentation URLs
    const docUrls = searchResults.results.slice(0, 3).map(result => result.url);
    const extractResults = await this.webSearchTool.extract(
      docUrls,
      `Extract API endpoints, parameters, authentication methods, and code examples for ${serviceName} API. Focus on technical details like HTTP methods, request/response formats, and authentication.`
    );

    // Step 3: If needed, crawl the main documentation site for comprehensive info
    let crawlResults: CrawlResult[] = [];
    if (searchResults.results.length > 0) {
      try {
        const mainDocUrl = this.getMainDocumentationUrl(searchResults.results[0].url);
        const crawlResponse = await this.webSearchTool.crawl(
          mainDocUrl,
          5,
          `Extract comprehensive API documentation for ${serviceName}, including all endpoints, authentication, and examples`
        );
        crawlResults = crawlResponse.results;
      } catch (error) {
        console.warn('Crawl failed, using extract results only:', error);
      }
    }

    // Step 4: Parse and structure the extracted information
    return this.parseAPIDocumentation(
      serviceName,
      searchResults,
      extractResults,
      crawlResults
    );
  }

  private getMainDocumentationUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract the base documentation URL
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length > 3) {
        pathParts.pop(); // Remove the last part
      }
      urlObj.pathname = pathParts.join('/');
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private parseAPIDocumentation(
    serviceName: string,
    searchResults: any,
    extractResults: ExtractResult[],
    crawlResults: CrawlResult[]
  ): APIDocumentation {
    // Combine all content
    const allContent = [
      ...extractResults.map(r => r.raw_content),
      ...crawlResults.map(r => r.content),
      ...searchResults.results.map(r => (r as any).fullContent || r.snippet)
    ].join('\n\n');

    // Extract structured information using regex and parsing
    const endpoints = this.extractEndpoints(allContent);
    const authentication = this.extractAuthentication(allContent);
    const examples = this.extractCodeExamples(allContent);
    const baseUrl = this.extractBaseUrl(allContent, searchResults.results[0]?.url);
    const description = this.extractDescription(allContent, serviceName);

    return {
      name: serviceName,
      description,
      baseUrl,
      endpoints,
      authentication,
      examples,
      additionalInfo: this.extractAdditionalInfo(allContent),
      sourceUrls: [
        ...extractResults.map(r => r.url),
        ...crawlResults.map(r => r.url),
        ...searchResults.results.map(r => r.url)
      ].filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
    };
  }

  private extractEndpoints(content: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // Common HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    // Regex patterns for endpoint detection
    const endpointPatterns = [
      /(```|`)(GET|POST|PUT|DELETE|PATCH)\s+([^\s`]+)(```|`)/gi,
      /(GET|POST|PUT|DELETE|PATCH)\s+([\/][^\s\n]+)/gi,
      /endpoint[:\s]*([^\n]+)\n*(?:method[:\s]*(GET|POST|PUT|DELETE|PATCH))?/gi
    ];

    for (const pattern of endpointPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[2] || match[1] || 'GET';
        const path = match[3] || match[2] || match[1];

        if (path && path.startsWith('/')) {
          const endpoint: APIEndpoint = {
            method: method as any,
            path: path.replace(/[`"]/g, ''),
            description: this.extractEndpointDescription(content, method, path),
            parameters: this.extractParameters(content, method, path)
          };

          // Avoid duplicates
          if (!endpoints.some(e => e.method === endpoint.method && e.path === endpoint.path)) {
            endpoints.push(endpoint);
          }
        }
      }
    }

    // If no endpoints found, try to extract from curl examples
    if (endpoints.length === 0) {
      const curlPattern = /curl\s+(?:-X\s+(GET|POST|PUT|DELETE|PATCH))?\s*['"]([^'"]+)['"]/gi;
      let curlMatch;
      while ((curlMatch = curlPattern.exec(content)) !== null) {
        const method = curlMatch[1] || 'GET';
        const url = curlMatch[2];

        try {
          const urlObj = new URL(url);
          if (endpoints.length < 10) { // Limit to prevent too many false positives
            endpoints.push({
              method: method as any,
              path: urlObj.pathname + urlObj.search,
              description: `Extracted from curl example`,
              parameters: this.extractParameters(content, method, urlObj.pathname)
            });
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }

    return endpoints.slice(0, 20); // Limit to reasonable number
  }

  private extractEndpointDescription(content: string, method: string, path: string): string {
    // Look for description near the endpoint
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(method) && line.includes(path)) {
        // Look in surrounding lines for description
        const contextLines = lines.slice(Math.max(0, i - 2), i + 3);
        for (const contextLine of contextLines) {
          if (contextLine.length > 20 && !contextLine.includes(method) && !contextLine.includes('```')) {
            return contextLine.trim().substring(0, 200);
          }
        }
      }
    }
    return `No description available for ${method} ${path}`;
  }

  private extractParameters(content: string, method: string, path: string): Parameter[] {
    const parameters: Parameter[] = [];

    // Look for parameter descriptions near the endpoint
    const lines = content.split('\n');
    let inEndpointSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes(method) && line.includes(path)) {
        inEndpointSection = true;
        continue;
      }

      if (inEndpointSection) {
        // Stop at next endpoint or section
        if (/(GET|POST|PUT|DELETE|PATCH)\s/[^\s]/.test(line) || /^#{1,3}\s/.test(line)) {
          break;
        }

        // Extract parameters from common patterns
        const paramPatterns = [
          /`?(\w+)`?\s*\(([^)]+)\)\s*[:-]\s*([^\n]+)/i,
          /(\w+)\s*[:=]\s*([^\s,]+)\s*[-–]\s*([^\n]+)/i,
          /parameter[:\s]*(\w+)[^\n]*type[:\s]*(\w+)[^\n]*required[^\n]*[:-]\s*([^\n]+)/i
        ];

        for (const pattern of paramPatterns) {
          const match = pattern.exec(line);
          if (match) {
            const name = match[1];
            const typeOrDesc = match[2];
            const description = match[3];

            const param: Parameter = {
              name,
              type: this.inferType(typeOrDesc),
              required: description.toLowerCase().includes('required'),
              description: description || `Parameter: ${name}`,
              location: this.inferParameterLocation(name, method)
            };

            if (!parameters.some(p => p.name === param.name)) {
              parameters.push(param);
            }
          }
        }
      }
    }

    return parameters;
  }

  private inferType(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('string') || lowerText.includes('text')) return 'string';
    if (lowerText.includes('number') || lowerText.includes('integer') || lowerText.includes('int')) return 'number';
    if (lowerText.includes('boolean') || lowerText.includes('bool')) return 'boolean';
    if (lowerText.includes('array') || lowerText.includes('list')) return 'array';
    if (lowerText.includes('object') || lowerText.includes('json')) return 'object';
    return 'string'; // Default
  }

  private inferParameterLocation(name: string, method: string): 'query' | 'path' | 'header' | 'body' {
    if (method === 'GET') return 'query';
    if (['POST', 'PUT', 'PATCH'].includes(method)) return 'body';
    if (name.toLowerCase().includes('id') && name.length < 10) return 'path';
    if (name.toLowerCase().includes('header') || name.toLowerCase().includes('auth')) return 'header';
    return 'query';
  }

  private extractAuthentication(content: string): AuthenticationInfo {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('api key') || lowerContent.includes('apikey')) {
      return {
        type: 'api_key',
        description: this.extractAuthDescription(content, 'api key'),
        apiKeyLocation: lowerContent.includes('header') ? 'header' : 'query',
        apiKeyName: this.extractAPIKeyName(content)
      };
    }

    if (lowerContent.includes('bearer') || lowerContent.includes('jwt')) {
      return {
        type: 'bearer',
        description: this.extractAuthDescription(content, 'bearer')
      };
    }

    if (lowerContent.includes('oauth2') || lowerContent.includes('oauth 2')) {
      return {
        type: 'oauth2',
        description: this.extractAuthDescription(content, 'oauth'),
        oauth2Url: this.extractOAuthUrl(content),
        scopes: this.extractOAuthScopes(content)
      };
    }

    if (lowerContent.includes('basic auth')) {
      return {
        type: 'basic',
        description: this.extractAuthDescription(content, 'basic auth')
      };
    }

    return {
      type: 'none',
      description: 'No authentication required or authentication method not specified in the documentation'
    };
  }

  private extractAuthDescription(content: string, authType: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(authType)) {
        // Return surrounding context
        const context = lines.slice(Math.max(0, i - 1), i + 2).join(' ').trim();
        return context.length > 20 ? context.substring(0, 200) : `Authentication using ${authType}`;
      }
    }
    return `Authentication using ${authType}`;
  }

  private extractAPIKeyName(content: string): string {
    const patterns = [
      /api[-_]?key[:\s]*['"`]([^'"`]+)['"`]/i,
      /header[:\s]*['"`]([^'"`]+)['"`].*api[-_]?key/i,
      /x-api-[-_]?key/i
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) {
        return match[1] || match[0];
      }
    }

    return 'X-API-Key'; // Common default
  }

  private extractOAuthUrl(content: string): string {
    const urlPattern = /(https?:\/\/[^\s]*oauth[^\s]*)/i;
    const match = urlPattern.exec(content);
    return match ? match[1] : '';
  }

  private extractOAuthScopes(content: string): string[] {
    const scopePattern = /scope[s]?[:\s]*([^\n]+)/i;
    const match = scopePattern.exec(content);
    if (match) {
      return match[1].split(/[,+\s]+/).filter(s => s.length > 0);
    }
    return [];
  }

  private extractCodeExamples(content: string): CodeExample[] {
    const examples: CodeExample[] = [];

    // Extract code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();

      if (code.length > 20 && code.length < 2000) { // Reasonable length
        examples.push({
          language,
          code,
          description: this.generateCodeExampleDescription(code, language)
        });
      }
    }

    // Look for curl examples specifically
    const curlPattern = /curl[^`]*['"`][^'"`]*['"`]/g;
    let curlMatch;

    while ((curlMatch = curlPattern.exec(content)) !== null) {
      const curlCommand = curlMatch[0];
      if (curlCommand.length > 30) {
        examples.push({
          language: 'bash',
          code: curlCommand,
          description: 'cURL command example'
        });
      }
    }

    return examples.slice(0, 10); // Limit number of examples
  }

  private generateCodeExampleDescription(code: string, language: string): string {
    if (language === 'bash' && code.includes('curl')) {
      return 'cURL command example';
    }
    if (language === 'javascript') {
      return 'JavaScript example';
    }
    if (language === 'python') {
      return 'Python example';
    }
    return `${language} code example`;
  }

  private extractBaseUrl(content: string, fallbackUrl?: string): string {
    // Look for base URL patterns
    const baseUrlPatterns = [
      /base[-_]?url[:\s]*['"`]([^'"`]+)['"`]/i,
      /endpoint[:\s]*['"`]([^'"`]+)['"`]/i,
      /api[-_]?url[:\s]*['"`]([^'"`]+)['"`]/i,
      /(https?:\/\/api\.[^\s\n]+)/i
    ];

    for (const pattern of baseUrlPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const baseUrl = match[1];
        if (baseUrl.startsWith('http')) {
          return baseUrl;
        }
      }
    }

    // Try to construct from a documentation URL
    if (fallbackUrl) {
      try {
        const url = new URL(fallbackUrl);
        // Convert documentation URL to potential API URL
        if (url.hostname.includes('docs.') || url.hostname.includes('developer.')) {
          const apiHostname = url.hostname.replace(/docs\.|developer\./, 'api.');
          return `${url.protocol}//${apiHostname}`;
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    return '';
  }

  private extractDescription(content: string, serviceName: string): string {
    // Look for service description
    const descriptionPatterns = [
      new RegExp(`${serviceName}[^.]*\\.([^\\n]{50,200})`, 'i'),
      /about[:\s]*([^\n]{30,200})/i,
      /description[:\s]*([^\n]{30,200})/i
    ];

    for (const pattern of descriptionPatterns) {
      const match = pattern.exec(content);
      if (match) {
        return match[1].trim();
      }
    }

    // Extract first meaningful paragraph
    const paragraphs = content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.length > 50 && paragraph.length < 300 &&
          !paragraph.includes('```') && !paragraph.includes('http')) {
        return paragraph.trim();
      }
    }

    return `${serviceName} API - No description available`;
  }

  private extractAdditionalInfo(content: string): string {
    // Extract additional useful information
    const infoPatterns = [
      /rate[-_]?limit[^:]*[:\s]*([^\n]{10,100})/i,
      /pricing[^:]*[:\s]*([^\n]{10,200})/i,
      /support[^:]*[:\s]*([^\n]{10,200})/i
    ];

    const info: string[] = [];

    for (const pattern of infoPatterns) {
      const match = pattern.exec(content);
      if (match) {
        info.push(match[0]);
      }
    }

    return info.join('\n\n') || 'No additional information available';
  }
}