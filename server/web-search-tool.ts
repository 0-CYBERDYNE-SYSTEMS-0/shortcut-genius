import axios from 'axios';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  total?: number;
}

export interface ExtractResult {
  url: string;
  raw_content: string;
  title?: string;
  description?: string;
  source: string;
}

export interface ExtractResponse {
  results: ExtractResult[];
  query: string;
  total: number;
}

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  metadata?: any;
  source: string;
}

export interface CrawlResponse {
  results: CrawlResult[];
  query: string;
  total: number;
  crawled_urls: string[];
}

export class WebSearchTool {
  private apiKey?: string;
  private searchEngine: 'tavily' | 'serper' | 'duckduckgo' | 'brave';

  constructor(apiKey?: string, searchEngine: 'tavily' | 'serper' | 'duckduckgo' | 'brave' = 'duckduckgo') {
    this.apiKey = apiKey;
    this.searchEngine = searchEngine;
  }

  async search(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
    try {
      switch (this.searchEngine) {
        case 'tavily':
          return await this.searchWithTavily(query, maxResults);
        case 'serper':
          return await this.searchWithSerper(query, maxResults);
        case 'brave':
          return await this.searchWithBrave(query, maxResults);
        case 'duckduckgo':
        default:
          return await this.searchWithDuckDuckGo(query, maxResults);
      }
    } catch (error) {
      console.error('Web search failed:', error);
      return {
        results: [],
        query,
        total: 0
      };
    }
  }

  // Extract content from specific URLs - perfect for API documentation
  async extract(urls: string[], prompt?: string): Promise<ExtractResponse> {
    if (this.searchEngine !== 'tavily') {
      throw new Error('Extract API is only available with Tavily search engine');
    }

    if (!this.apiKey) {
      throw new Error('Tavily API key required for extract functionality');
    }

    try {
      const response = await axios.post('https://api.tavily.com/extract', {
        api_key: this.apiKey,
        urls,
        prompt: prompt || 'Extract the main content, API endpoints, parameters, and examples from this documentation'
      });

      const results = response.data.results.map((result: any) => ({
        url: result.url,
        raw_content: result.raw_content || result.content,
        title: result.title,
        description: result.description,
        source: 'Tavily Extract'
      }));

      return {
        results,
        query: prompt || 'Content extraction',
        total: results.length
      };
    } catch (error) {
      console.error('Tavily extract failed:', error);
      return {
        results: [],
        query: prompt || 'Content extraction',
        total: 0
      };
    }
  }

  // Crawl entire websites or documentation sections
  async crawl(url: string, limit: number = 10, prompt?: string): Promise<CrawlResponse> {
    if (this.searchEngine !== 'tavily') {
      throw new Error('Crawl API is only available with Tavily search engine');
    }

    if (!this.apiKey) {
      throw new Error('Tavily API key required for crawl functionality');
    }

    try {
      const response = await axios.post('https://api.tavily.com/crawl', {
        api_key: this.apiKey,
        url,
        limit,
        prompt: prompt || 'Extract API documentation, endpoints, parameters, and code examples',
        include_raw_content: true,
        max_depth: 2 // Don't go too deep for performance
      });

      const results = response.data.results.map((result: any) => ({
        url: result.url,
        title: result.title,
        content: result.raw_content || result.content,
        metadata: result.metadata,
        source: 'Tavily Crawl'
      }));

      return {
        results,
        query: prompt || 'Website crawl',
        total: results.length,
        crawled_urls: response.data.crawled_urls || [url]
      };
    } catch (error) {
      console.error('Tavily crawl failed:', error);
      return {
        results: [],
        query: prompt || 'Website crawl',
        total: 0,
        crawled_urls: []
      };
    }
  }

  // Advanced search with full content extraction for API documentation
  async searchForAPIDocumentation(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
    if (this.searchEngine === 'tavily' && this.apiKey) {
      try {
        const response = await axios.post('https://api.tavily.com/search', {
          api_key: this.apiKey,
          query: `${query} API documentation endpoints parameters examples`,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: true,
          include_images: false,
          max_results: maxResults,
          include_domains: ['docs.github.com', 'developer.twitter.com', 'openweathermap.org', 'api.mongodb.com', 'developers.google.com'],
          exclude_domains: ['stackoverflow.com', 'reddit.com']
        });

        const results = response.data.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          snippet: result.raw_content ? result.raw_content.substring(0, 500) + '...' : result.content,
          source: 'Tavily Advanced',
          fullContent: result.raw_content // Store full content for processing
        }));

        return {
          results,
          query,
          total: response.data.results.length,
          answer: response.data.answer // AI-synthesized answer
        };
      } catch (error) {
        console.error('Advanced Tavily search failed, falling back to basic search:', error);
      }
    }

    // Fallback to basic search
    return this.search(query, maxResults);
  }

  private async searchWithTavily(query: string, maxResults: number): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Tavily API key required');
    }

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: this.apiKey,
      query,
      search_depth: 'advanced', // Upgraded to advanced for better results
      include_answer: true, // Enable AI answers
      include_images: false,
      include_raw_content: true, // Enable full content extraction
      max_results: maxResults
    });

    const results = response.data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.raw_content ? result.raw_content.substring(0, 300) + '...' : result.content,
      source: 'Tavily',
      fullContent: result.raw_content // Store full content for potential processing
    }));

    return {
      results,
      query,
      total: response.data.results.length,
      answer: response.data.answer // Include AI-synthesized answer
    };
  }

  private async searchWithSerper(query: string, maxResults: number): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Serper API key required');
    }

    const response = await axios.post('https://google.serper.dev/search', {
      q: query,
      num: maxResults
    }, {
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    const organic = response.data.organic || [];

    return {
      results: organic.map((result: any) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        source: 'Google'
      })),
      query,
      total: organic.length
    };
  }

  private async searchWithBrave(query: string, maxResults: number): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key required');
    }

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: maxResults,
        search_lang: 'en',
        country: 'US',
        safesearch: 'moderate',
        text_decorations: false,
        result_filter: 'web'
      },
      headers: {
        'X-Subscription-Token': this.apiKey,
        'Accept': 'application/json'
      }
    });

    const results = response.data.web?.results || [];

    return {
      results: results.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: 'Brave'
      })),
      query,
      total: results.length
    };
  }

  private async searchWithDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResponse> {
    // Using DuckDuckGo Instant Answer API (free, no API key needed)
    // Note: This is limited but works without authentication
    try {
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: '1',
          skip_disambig: '1'
        },
        headers: {
          'User-Agent': 'ShortcutGenius/1.0'
        }
      });

      const results: WebSearchResult[] = [];

      // Add abstract if available
      if (response.data.Abstract) {
        results.push({
          title: response.data.Heading || 'DuckDuckGo Result',
          url: response.data.AbstractURL || 'https://duckduckgo.com',
          snippet: response.data.Abstract,
          source: 'DuckDuckGo'
        });
      }

      // Add related topics
      if (response.data.RelatedTopics && Array.isArray(response.data.RelatedTopics)) {
        const topics = response.data.RelatedTopics
          .slice(0, maxResults - results.length)
          .filter((topic: any) => topic.Text && topic.FirstURL)
          .map((topic: any) => ({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo'
          }));

        results.push(...topics);
      }

      // If no results, create a fallback search result
      if (results.length === 0) {
        results.push({
          title: `Search results for "${query}"`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `No direct results found. You can search for "${query}" on DuckDuckGo for more information.`,
          source: 'DuckDuckGo'
        });
      }

      return {
        results: results.slice(0, maxResults),
        query,
        total: results.length
      };
    } catch (error) {
      // Fallback result if DuckDuckGo API fails
      return {
        results: [{
          title: `Search for "${query}"`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `Search engine temporarily unavailable. Try searching for "${query}" manually.`,
          source: 'DuckDuckGo'
        }],
        query,
        total: 1
      };
    }
  }

  // Function calling tool definition for OpenAI/Anthropic
  getToolDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: 'web_search',
        description: 'Search the web for current information, news, or specific topics. Use this when you need up-to-date information or when the user asks about recent events, current prices, latest versions, or anything that might have changed recently.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query. Be specific and use relevant keywords.'
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of search results to return (default: 5, max: 10)',
              minimum: 1,
              maximum: 10
            },
            search_type: {
              type: 'string',
              enum: ['basic', 'api_docs'],
              description: 'Type of search: basic for general queries, api_docs for API documentation searches',
              default: 'basic'
            }
          },
          required: ['query']
        }
      }
    };
  }

  // Extract tool definition for OpenAI/Anthropic
  getExtractToolDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: 'web_extract',
        description: 'Extract detailed content from specific URLs, perfect for getting complete API documentation, specifications, or detailed information from known sources.',
        parameters: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of URLs to extract content from'
            },
            prompt: {
              type: 'string',
              description: 'Custom prompt for what specific information to extract (optional)'
            }
          },
          required: ['urls']
        }
      }
    };
  }

  // Crawl tool definition for OpenAI/Anthropic
  getCrawlToolDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: 'web_crawl',
        description: 'Crawl entire websites or documentation sections to get comprehensive information about APIs, services, or topics. Use this when you need to explore multiple pages from the same site.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Starting URL to crawl from'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of pages to crawl (default: 10)',
              minimum: 1,
              maximum: 50,
              default: 10
            },
            prompt: {
              type: 'string',
              description: 'Custom prompt for what specific information to look for during crawling (optional)'
            }
          },
          required: ['url']
        }
      }
    };
  }

  // Get all available tools for comprehensive integration
  getAllToolDefinitions() {
    return [
      this.getToolDefinition(),
      this.getExtractToolDefinition(),
      this.getCrawlToolDefinition()
    ];
  }

  // OpenRouter function calling format
  getOpenRouterToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for current information, news, or specific topics',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return',
              default: 5
            },
            search_type: {
              type: 'string',
              enum: ['basic', 'api_docs'],
              description: 'Type of search: basic or api_docs',
              default: 'basic'
            }
          },
          required: ['query']
        }
      }
    };
  }

  // OpenRouter extract tool definition
  getOpenRouterExtractToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'web_extract',
        description: 'Extract detailed content from specific URLs for API documentation',
        parameters: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of URLs to extract content from'
            },
            prompt: {
              type: 'string',
              description: 'Custom extraction prompt (optional)'
            }
          },
          required: ['urls']
        }
      }
    };
  }

  // OpenRouter crawl tool definition
  getOpenRouterCrawlToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'web_crawl',
        description: 'Crawl websites for comprehensive API documentation',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Starting URL to crawl from'
            },
            limit: {
              type: 'number',
              description: 'Maximum pages to crawl',
              default: 10
            },
            prompt: {
              type: 'string',
              description: 'Custom crawl prompt (optional)'
            }
          },
          required: ['url']
        }
      }
    };
  }

  // Get all OpenRouter tool definitions
  getAllOpenRouterToolDefinitions() {
    return [
      this.getOpenRouterToolDefinition(),
      this.getOpenRouterExtractToolDefinition(),
      this.getOpenRouterCrawlToolDefinition()
    ];
  }

  async executeToolCall(toolName: string, args: any): Promise<string> {
    try {
      switch (toolName) {
        case 'web_search':
          return await this.executeSearch(args);
        case 'web_extract':
          return await this.executeExtract(args);
        case 'web_crawl':
          return await this.executeCrawl(args);
        default:
          // Backward compatibility - if only args provided, assume search
          return await this.executeSearch(args);
      }
    } catch (error) {
      console.error(`Tool execution error for ${toolName}:`, error);
      return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async executeSearch(args: any): Promise<string> {
    const { query, max_results = 5, search_type = 'basic' } = args;

    let searchResults;
    if (search_type === 'api_docs') {
      searchResults = await this.searchForAPIDocumentation(query, max_results);
    } else {
      searchResults = await this.search(query, max_results);
    }

    if (searchResults.results.length === 0) {
      return `No search results found for "${query}". The search service may be temporarily unavailable.`;
    }

    let result = `Web search results for "${query}":\n\n`;

    searchResults.results.forEach((item, index) => {
      result += `${index + 1}. ${item.title}\n`;
      result += `   URL: ${item.url}\n`;
      result += `   Summary: ${item.snippet}\n\n`;
    });

    // Include AI answer if available from Tavily
    if ((searchResults as any).answer) {
      result += `\nAI-Synthesized Answer:\n${(searchResults as any).answer}\n`;
    }

    return result.trim();
  }

  private async executeExtract(args: any): Promise<string> {
    const { urls, prompt } = args;

    if (!Array.isArray(urls) || urls.length === 0) {
      return 'Error: urls parameter must be a non-empty array of URLs';
    }

    const extractResults = await this.extract(urls, prompt);

    if (extractResults.results.length === 0) {
      return `No content could be extracted from the provided URLs: ${urls.join(', ')}`;
    }

    let result = `Content extraction results:\n\n`;

    extractResults.results.forEach((item, index) => {
      result += `${index + 1}. ${item.title || 'Untitled'}\n`;
      result += `   URL: ${item.url}\n`;
      result += `   Content: ${item.raw_content.substring(0, 1000)}${item.raw_content.length > 1000 ? '...' : ''}\n\n`;
    });

    return result.trim();
  }

  private async executeCrawl(args: any): Promise<string> {
    const { url, limit = 10, prompt } = args;

    const crawlResults = await this.crawl(url, limit, prompt);

    if (crawlResults.results.length === 0) {
      return `No content could be crawled from ${url}. The website might be inaccessible or block crawling.`;
    }

    let result = `Website crawl results for "${url}":\n`;
    result += `Pages crawled: ${crawlResults.total}\n`;
    result += `Crawled URLs: ${crawlResults.crawled_urls.join(', ')}\n\n`;

    crawlResults.results.forEach((item, index) => {
      result += `${index + 1}. ${item.title}\n`;
      result += `   URL: ${item.url}\n`;
      result += `   Content: ${item.content.substring(0, 500)}${item.content.length > 500 ? '...' : ''}\n\n`;
    });

    return result.trim();
  }
}