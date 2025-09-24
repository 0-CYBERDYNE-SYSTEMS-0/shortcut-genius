import { ModelConfig, AIModel } from './types';

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  // OpenAI Direct Models
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    category: 'balanced',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'October 2023',
    },
    cost: { input: 2.5, output: 10 }
  },
  'gpt-4-1': {
    id: 'gpt-4-1',
    name: 'GPT-4.1',
    provider: 'openai',
    category: 'balanced',
    capabilities: {
      maxTokens: 16384,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'June 2024',
      supportsCustomTools: true,
    },
    cost: { input: 30, output: 60 }
  },
  'gpt-4-1-mini': {
    id: 'gpt-4-1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    category: 'fast',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'June 2024',
      supportsCustomTools: true,
    },
    cost: { input: 5, output: 20 }
  },
  'gpt-4-1-nano': {
    id: 'gpt-4-1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    category: 'fast',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'June 2024',
    },
    cost: { input: 1, output: 4 }
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      supportsCustomTools: true,
      maxTokens: 32768,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 50, output: 200 }
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    category: 'balanced',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      maxTokens: 16384,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 15, output: 60 }
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    category: 'fast',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 3, output: 12 }
  },
  'o3': {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      supportsCustomTools: true,
      maxTokens: 65536,
      contextWindow: 200000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 60, output: 240 }
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      maxTokens: 32768,
      contextWindow: 200000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 15, output: 60 }
  },
  'o4-mini': {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      maxTokens: 16384,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 8, output: 32 }
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    category: 'balanced',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 200000,
      hasKnowledgeCutoff: 'April 2024',
    },
    cost: { input: 3, output: 15 }
  },

  // OpenRouter Models
  'openrouter/openai/gpt-4o': {
    id: 'openrouter/openai/gpt-4o',
    name: 'GPT-4o (OpenRouter)',
    provider: 'openrouter',
    category: 'balanced',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'October 2023',
    },
    cost: { input: 2.5, output: 10 }
  },
  'openrouter/openai/gpt-5': {
    id: 'openrouter/openai/gpt-5',
    name: 'GPT-5 (OpenRouter)',
    provider: 'openrouter',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      supportsVerbosity: true,
      supportsCustomTools: true,
      maxTokens: 32768,
      contextWindow: 1000000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 50, output: 200 }
  },
  'openrouter/anthropic/claude-3-5-sonnet': {
    id: 'openrouter/anthropic/claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    provider: 'openrouter',
    category: 'balanced',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 200000,
      hasKnowledgeCutoff: 'April 2024',
    },
    cost: { input: 3, output: 15 }
  },
  'openrouter/anthropic/claude-4': {
    id: 'openrouter/anthropic/claude-4',
    name: 'Claude 4 (OpenRouter)',
    provider: 'openrouter',
    category: 'reasoning',
    capabilities: {
      supportsReasoning: true,
      maxTokens: 16384,
      contextWindow: 500000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 15, output: 75 }
  },
  'openrouter/google/gemini-2-5-pro': {
    id: 'openrouter/google/gemini-2-5-pro',
    name: 'Gemini 2.5 Pro (OpenRouter)',
    provider: 'openrouter',
    category: 'balanced',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 2000000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 3.5, output: 10.5 }
  },
  'openrouter/meta/llama-3-3-70b-instruct': {
    id: 'openrouter/meta/llama-3-3-70b-instruct',
    name: 'Llama 3.3 70B (OpenRouter)',
    provider: 'openrouter',
    category: 'coding',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 131072,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 0.59, output: 0.79 }
  },
  'openrouter/mistralai/mistral-large-2411': {
    id: 'openrouter/mistralai/mistral-large-2411',
    name: 'Mistral Large 2411 (OpenRouter)',
    provider: 'openrouter',
    category: 'balanced',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 2, output: 6 }
  },
  'openrouter/qwen/qwen-2-5-72b-instruct': {
    id: 'openrouter/qwen/qwen-2-5-72b-instruct',
    name: 'Qwen 2.5 72B (OpenRouter)',
    provider: 'openrouter',
    category: 'balanced',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 131072,
      hasKnowledgeCutoff: 'October 2024',
    },
    cost: { input: 0.8, output: 2.4 }
  },
  'openrouter/deepseek/deepseek-v3': {
    id: 'openrouter/deepseek/deepseek-v3',
    name: 'DeepSeek V3 (OpenRouter)',
    provider: 'openrouter',
    category: 'coding',
    capabilities: {
      maxTokens: 8192,
      contextWindow: 65536,
      hasKnowledgeCutoff: 'December 2024',
    },
    cost: { input: 0.27, output: 1.1 }
  }
};

export const getModelsByCategory = (category: ModelConfig['category']) => {
  return Object.values(MODEL_CONFIGS).filter(model => model.category === category);
};

export const getModelsByProvider = (provider: ModelConfig['provider']) => {
  return Object.values(MODEL_CONFIGS).filter(model => model.provider === provider);
};

export const getModelConfig = (modelId: AIModel): ModelConfig => {
  // Return existing config if available
  if (MODEL_CONFIGS[modelId]) {
    return MODEL_CONFIGS[modelId];
  }

  // For OpenRouter models, create a default config
  if (isOpenRouterModel(modelId)) {
    return {
      id: modelId,
      name: modelId.split('/').pop() || modelId,
      provider: 'openrouter',
      category: 'balanced',
      capabilities: {
        supportsReasoning: false,
        supportsVerbosity: false,
        supportsCustomTools: true,
        maxTokens: 4096,
        contextWindow: 4096
      }
    };
  }

  // Fallback for unknown models
  return {
    id: modelId,
    name: modelId,
    provider: 'openai', // Default fallback
    category: 'balanced',
    capabilities: {
      supportsReasoning: false,
      supportsVerbosity: false,
      maxTokens: 4096,
      contextWindow: 4096
    }
  };
};

export const supportsReasoning = (modelId: AIModel): boolean => {
  return MODEL_CONFIGS[modelId]?.capabilities?.supportsReasoning ?? false;
};

export const supportsVerbosity = (modelId: AIModel): boolean => {
  return MODEL_CONFIGS[modelId]?.capabilities?.supportsVerbosity ?? false;
};

export const isOpenRouterModel = (modelId: AIModel): boolean => {
  // OpenRouter models have the format: provider/model (e.g., "openai/gpt-4o-mini", "anthropic/claude-3-5-sonnet")
  // But are NOT in our static MODEL_CONFIGS (which only has direct API models)
  const hasProviderSlash = modelId.includes('/') && !modelId.startsWith('openrouter/');
  const notInStaticConfigs = !MODEL_CONFIGS[modelId];

  // Also handle explicit openrouter prefix for backwards compatibility
  const isExplicitOpenRouter = modelId.startsWith('openrouter/');

  return hasProviderSlash && notInStaticConfigs || isExplicitOpenRouter;
};

export const getOpenRouterModelName = (modelId: AIModel): string => {
  if (!isOpenRouterModel(modelId)) return modelId;

  // Handle explicit openrouter prefix
  if (modelId.startsWith('openrouter/')) {
    return modelId.replace('openrouter/', '');
  }

  // For models like "openai/gpt-4o-mini", return as-is since that's the OpenRouter API format
  return modelId;
};

// Default reasoning settings for models that support it
export const DEFAULT_REASONING_OPTIONS = {
  reasoning_effort: 'medium' as const,
  verbosity: 'medium' as const
};