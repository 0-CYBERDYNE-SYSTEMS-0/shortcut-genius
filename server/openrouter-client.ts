import OpenAI from 'openai';
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
      tool_calls?: any[];
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
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_call_id?: string;
  tool_calls?: any[];
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
  tools?: any[];
  tool_choice?: any;
}

export class OpenRouterClient {
  private openaiClient: OpenAI;
  private fallbackClient: AxiosInstance;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('⚠️ OpenRouter API key not provided - OpenRouter features will be limited');
    }

    // Use OpenAI SDK with OpenRouter base URL (recommended by OpenRouter)
    this.openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.BASE_URL || 'http://localhost:5000',
        'X-Title': 'ShortcutGenius'
      },
      timeout: 120000
    });

    // Fallback axios client for direct API calls
    this.fallbackClient = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BASE_URL || 'http://localhost:5000',
        'X-Title': 'ShortcutGenius'
      },
      timeout: 120000
    });
  }

  async createChatCompletion(request: OpenRouterChatCompletionRequest): Promise<OpenRouterResponse> {
    try {
      // Try OpenAI SDK first (recommended by OpenRouter)
      const response = await this.openaiClient.chat.completions.create({
        model: request.model,
        messages: request.messages as any,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stream: request.stream,
        tools: request.tools,
        tool_choice: request.tool_choice
      });

      return response as OpenRouterResponse;
    } catch (error: any) {
      console.error('OpenRouter API error with OpenAI SDK:', error.response?.data || error.message);

      // Fallback to direct axios call
      try {
        const response = await this.fallbackClient.post('/chat/completions', request);
        return response.data;
      } catch (fallbackError: any) {
        console.error('OpenRouter API error with fallback:', fallbackError.response?.data || fallbackError.message);
        throw new Error(
          `OpenRouter API error: ${fallbackError.response?.data?.error?.message || fallbackError.message}`
        );
      }
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