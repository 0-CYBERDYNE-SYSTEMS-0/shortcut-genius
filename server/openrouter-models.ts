import axios from 'axios';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export class OpenRouterModelsService {
  private apiKey: string;
  private modelsCache: OpenRouterModel[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchAvailableModels(): Promise<OpenRouterModel[]> {
    // Return cached models if still valid
    if (this.modelsCache && Date.now() < this.cacheExpiry) {
      return this.modelsCache;
    }

    try {
      const response = await axios.get<OpenRouterModelsResponse>('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.BASE_URL || 'http://localhost:5000',
          'X-Title': 'ShortcutGenius'
        }
      });

      this.modelsCache = response.data.data;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return this.modelsCache;
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);

      // Return fallback models if API fails
      return this.getFallbackModels();
    }
  }

  private getFallbackModels(): OpenRouterModel[] {
    return [
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI GPT-4o via OpenRouter',
        context_length: 128000
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'OpenAI GPT-4o Mini via OpenRouter',
        context_length: 128000
      },
      {
        id: 'anthropic/claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Anthropic Claude 3.5 Sonnet via OpenRouter',
        context_length: 200000
      },
      {
        id: 'anthropic/claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        description: 'Anthropic Claude 3.5 Haiku via OpenRouter',
        context_length: 200000
      },
      {
        id: 'google/gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        description: 'Google Gemini 2.0 Flash via OpenRouter',
        context_length: 1000000
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        description: 'Meta Llama 3.3 70B Instruct via OpenRouter',
        context_length: 131072
      },
      {
        id: 'mistralai/mistral-large-2411',
        name: 'Mistral Large 2411',
        description: 'Mistral Large 2411 via OpenRouter',
        context_length: 128000
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        description: 'Qwen 2.5 72B Instruct via OpenRouter',
        context_length: 32768
      },
      {
        id: 'deepseek/deepseek-v3',
        name: 'DeepSeek V3',
        description: 'DeepSeek V3 via OpenRouter',
        context_length: 65536
      },
      {
        id: 'x-ai/grok-2-1212',
        name: 'Grok 2',
        description: 'xAI Grok 2 via OpenRouter',
        context_length: 128000
      }
    ];
  }

  async getModelById(modelId: string): Promise<OpenRouterModel | null> {
    const models = await this.fetchAvailableModels();
    return models.find(model => model.id === modelId) || null;
  }

  async searchModels(query: string): Promise<OpenRouterModel[]> {
    const models = await this.fetchAvailableModels();
    const lowercaseQuery = query.toLowerCase();

    return models.filter(model =>
      model.name.toLowerCase().includes(lowercaseQuery) ||
      model.id.toLowerCase().includes(lowercaseQuery) ||
      (model.description && model.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  categorizeModels(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
    const categories: Record<string, OpenRouterModel[]> = {
      'OpenAI': [],
      'Anthropic': [],
      'Google': [],
      'Meta': [],
      'Mistral': [],
      'xAI': [],
      'Other': []
    };

    models.forEach(model => {
      const modelId = model.id.toLowerCase();
      if (modelId.startsWith('openai/')) {
        categories['OpenAI'].push(model);
      } else if (modelId.startsWith('anthropic/')) {
        categories['Anthropic'].push(model);
      } else if (modelId.startsWith('google/')) {
        categories['Google'].push(model);
      } else if (modelId.startsWith('meta-llama/')) {
        categories['Meta'].push(model);
      } else if (modelId.startsWith('mistralai/')) {
        categories['Mistral'].push(model);
      } else if (modelId.startsWith('x-ai/')) {
        categories['xAI'].push(model);
      } else {
        categories['Other'].push(model);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }
}