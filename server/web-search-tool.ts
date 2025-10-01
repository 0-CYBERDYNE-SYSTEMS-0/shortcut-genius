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

  private async searchWithTavily(query: string, maxResults: number): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Tavily API key required');
    }

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: this.apiKey,
      query,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      max_results: maxResults
    });

    return {
      results: response.data.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
        source: 'Tavily'
      })),
      query,
      total: response.data.results.length
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
            }
          },
          required: ['query']
        }
      }
    };
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
            }
          },
          required: ['query']
        }
      }
    };
  }

  async executeToolCall(args: any): Promise<string> {
    const { query, max_results = 5 } = args;
    const searchResults = await this.search(query, max_results);

    if (searchResults.results.length === 0) {
      return `No search results found for "${query}". The search service may be temporarily unavailable.`;
    }

    let result = `Web search results for "${query}":\n\n`;

    searchResults.results.forEach((item, index) => {
      result += `${index + 1}. ${item.title}\n`;
      result += `   URL: ${item.url}\n`;
      result += `   Summary: ${item.snippet}\n\n`;
    });

    return result.trim();
  }
}