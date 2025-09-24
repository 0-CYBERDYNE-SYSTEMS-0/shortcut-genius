import axios, { AxiosInstance } from 'axios';

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BASE_URL || 'http://localhost:4321',
        'X-Title': 'ShortcutGenius'
      },
      timeout: 120000 // 2 minutes timeout
    });
  }

  async createChatCompletion(request: OpenRouterChatCompletionRequest): Promise<OpenRouterResponse> {
    try {
      const response = await this.client.post('/chat/completions', request);
      return response.data;
    } catch (error: any) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error(
        `OpenRouter API error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  async getModels() {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error: any) {
      console.error('OpenRouter models API error:', error.response?.data || error.message);
      throw new Error(
        `Failed to fetch models: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  async getGeneration(generationId: string) {
    try {
      const response = await this.client.get(`/generation?id=${generationId}`);
      return response.data;
    } catch (error: any) {
      console.error('OpenRouter generation API error:', error.response?.data || error.message);
      throw new Error(
        `Failed to fetch generation: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  // Helper method to format model name for OpenRouter
  static formatModelName(modelId: string): string {
    if (modelId.startsWith('openrouter/')) {
      return modelId.replace('openrouter/', '');
    }
    return modelId;
  }

  // Helper method to map OpenRouter models to standard format
  static mapOpenRouterModels(models: any[]): Array<{
    id: string;
    name: string;
    description: string;
    pricing: {
      prompt: string;
      completion: string;
    };
    context_length: number;
    architecture: {
      modality: string;
      tokenizer: string;
      instruct_type?: string;
    };
    top_provider: {
      max_completion_tokens?: number;
      is_moderated: boolean;
    };
    per_request_limits?: {
      prompt_tokens?: string;
      completion_tokens?: string;
    };
  }> {
    return models.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description || '',
      pricing: model.pricing,
      context_length: model.context_length,
      architecture: model.architecture,
      top_provider: model.top_provider,
      per_request_limits: model.per_request_limits
    }));
  }
}