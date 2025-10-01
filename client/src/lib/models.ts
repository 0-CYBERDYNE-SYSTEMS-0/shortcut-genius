import { ModelConfig, AIModel } from './types';

// Only include actual available OpenAI models
export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  // OpenAI Direct Models (Real Available Models)
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    category: 'balanced',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'October 2023',
      supportsCustomTools: true,
    },
    cost: { input: 2.5, output: 10 }
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    category: 'fast',
    capabilities: {
      maxTokens: 16384,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'October 2023',
      supportsCustomTools: true,
    },
    cost: { input: 0.15, output: 0.60 }
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    category: 'balanced',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'April 2024',
      supportsCustomTools: true,
    },
    cost: { input: 10, output: 30 }
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    category: 'fast',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 16385,
      hasKnowledgeCutoff: 'September 2021',
      supportsCustomTools: true,
    },
    cost: { input: 0.5, output: 1.5 }
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
      supportsCustomTools: true,
    },
    cost: { input: 3, output: 15 }
  },

  // OpenRouter models will be loaded dynamically
};

// Check if a model is from OpenRouter
export const isOpenRouterModel = (modelId: AIModel): boolean => {
  const hasProviderSlash = modelId.includes('/') && !modelId.startsWith('openrouter/');
  const isOpenRouterPrefixed = modelId.startsWith('openrouter/');
  return hasProviderSlash || isOpenRouterPrefixed;
};

// Extract clean model name for OpenRouter
export const getOpenRouterModelName = (modelId: AIModel): string => {
  if (modelId.startsWith('openrouter/')) {
    return modelId.replace('openrouter/', '');
  }
  if (modelId.includes('/')) {
    return modelId.split('/')[1];
  }
  return modelId;
};

// Check if model supports reasoning
export const supportsReasoning = (modelId: AIModel): boolean => {
  if (isOpenRouterModel(modelId)) {
    const modelName = getOpenRouterModelName(modelId).toLowerCase();
    return modelName.includes('reasoning') || modelName.includes('o1') || modelName.includes('o3');
  }
  const config = MODEL_CONFIGS[modelId];
  return config?.capabilities?.supportsReasoning || false;
};

// Check if model supports verbosity
export const supportsVerbosity = (modelId: AIModel): boolean => {
  if (isOpenRouterModel(modelId)) {
    const modelName = getOpenRouterModelName(modelId).toLowerCase();
    return modelName.includes('reasoning') || modelName.includes('o1') || modelName.includes('o3');
  }
  const config = MODEL_CONFIGS[modelId];
  return config?.capabilities?.supportsVerbosity || false;
};

// Default reasoning options
export const DEFAULT_REASONING_OPTIONS = {
  reasoning_effort: 'medium' as 'low' | 'medium' | 'high',
  verbosity: 'medium' as 'low' | 'medium' | 'high'
};

// Get model configuration with fallback for unknown models
export const getModelConfig = (modelId: AIModel): ModelConfig => {
  // Check if it's a predefined model
  if (MODEL_CONFIGS[modelId]) {
    return MODEL_CONFIGS[modelId];
  }

  // Handle OpenRouter models
  if (isOpenRouterModel(modelId)) {
    const modelName = getOpenRouterModelName(modelId);
    const provider = modelId.split('/')[0];

    // Try to infer capabilities from model name
    const isMini = modelName.toLowerCase().includes('mini');
    const isReasoning = modelName.toLowerCase().includes('reasoning') ||
                       modelName.toLowerCase().includes('o1') ||
                       modelName.toLowerCase().includes('o3');

    return {
      id: modelId,
      name: modelName,
      provider: provider,
      category: isReasoning ? 'reasoning' : (isMini ? 'fast' : 'balanced'),
      capabilities: {
        maxTokens: isMini ? 16384 : 4096,
        contextWindow: isMini ? 128000 : 128000,
        hasKnowledgeCutoff: 'Recent',
        supportsCustomTools: true,
        supportsReasoning: isReasoning,
        supportsVerbosity: isReasoning,
      },
      cost: { input: isMini ? 1 : 5, output: isMini ? 2 : 15 }
    };
  }

  // Fallback for unknown models
  return {
    id: modelId,
    name: modelId,
    provider: 'unknown',
    category: 'balanced',
    capabilities: {
      maxTokens: 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'Recent',
      supportsCustomTools: true,
    },
    cost: { input: 5, output: 15 }
  };
};

// Generate fallback config for any model
export const generateFallbackConfig = (modelId: AIModel): ModelConfig => {
  const isMini = modelId.toLowerCase().includes('mini');
  const isReasoning = modelId.toLowerCase().includes('reasoning') ||
                     modelId.toLowerCase().includes('o1') ||
                     modelId.toLowerCase().includes('o3');

  return {
    id: modelId,
    name: modelId,
    provider: 'unknown',
    category: isReasoning ? 'reasoning' : (isMini ? 'fast' : 'balanced'),
    capabilities: {
      maxTokens: isMini ? 16384 : 4096,
      contextWindow: 128000,
      hasKnowledgeCutoff: 'Recent',
      supportsCustomTools: true,
      supportsReasoning: isReasoning,
      supportsVerbosity: isReasoning,
    },
    cost: { input: isMini ? 1 : 5, output: isMini ? 2 : 15 }
  };
};