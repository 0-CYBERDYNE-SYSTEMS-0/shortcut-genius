// AI Models available for shortcut processing
export type AIModel = string;

export interface ModelCapabilities {
  supportsReasoning?: boolean;
  supportsVerbosity?: boolean;
  supportsCustomTools?: boolean;
  maxTokens?: number;
  contextWindow?: number;
  hasKnowledgeCutoff?: string;
}

export interface ReasoningOptions {
  reasoning_effort?: 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

export interface AIResponse {
  content: string;
  error?: string;
  reasoning_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  category: 'reasoning' | 'fast' | 'balanced' | 'coding';
  capabilities: ModelCapabilities;
  cost?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
}

// Dynamic OpenRouter Model interface
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
}

// Web search interfaces
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

// Enhanced AI Response with tool calling
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentSearchActivity {
  id: string;
  timestamp: Date;
  type: 'search' | 'extract' | 'crawl';
  status: 'running' | 'completed' | 'failed';
  query?: string;
  toolName: string;
  results?: any;
  sources?: WebSearchResult[];
  error?: string;
}

export interface EnhancedAIResponse extends AIResponse {
  tool_calls?: ToolCall[];
  searchActivity?: AgentSearchActivity[];
  sourcesUsed?: WebSearchResult[];
  generatedWithWebSearch?: boolean;
  processingSteps?: string[];
}

export interface AIResponseWithTools extends AIResponse {
  tool_calls?: ToolCall[];
}
