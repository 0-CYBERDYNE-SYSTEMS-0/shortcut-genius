import { AIModel, AIResponse, EnhancedAIResponse, ReasoningOptions, AgentSearchActivity, WebSearchResult } from './types';
import { postData } from './fetcher';

const rateLimits = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || 0;
  
  if (userRequests >= MAX_REQUESTS) {
    return false;
  }
  
  rateLimits.set(userId, userRequests + 1);
  setTimeout(() => rateLimits.set(userId, (rateLimits.get(userId) || 1) - 1), RATE_LIMIT_WINDOW);
  
  return true;
}

export async function processWithAI(
  model: AIModel,
  prompt: string,
  userId: string,
  type: 'analyze' | 'generate' = 'analyze',
  reasoningOptions?: ReasoningOptions,
  onActivityUpdate?: (activity: AgentSearchActivity) => void
): Promise<EnhancedAIResponse> {
  if (!checkRateLimit(userId)) {
    return { content: '', error: 'Rate limit exceeded. Please try again later.' };
  }

  try {
    const result = await postData('/api/process', {
      model,
      prompt,
      type,
      reasoningOptions,
      includeSearchActivity: true // Request enhanced response with search activity
      // Removed API keys - server handles authentication
    });
    
    // Convert server response to EnhancedAIResponse format
    const enhancedResult: EnhancedAIResponse = {
      ...result,
      generatedWithWebSearch: !!(result.searchActivity && result.searchActivity.length > 0),
      processingSteps: result.processingSteps || []
    };
    
    // Notify client of search activities if callback provided
    if (onActivityUpdate && result.searchActivity) {
      result.searchActivity.forEach((activity: AgentSearchActivity) => {
        onActivityUpdate(activity);
      });
    }
    
    return enhancedResult;
  } catch (error) {
    return {
      content: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      generatedWithWebSearch: false,
      processingSteps: []
    };
  }
}

export interface ChatResponse {
  response: string;
  searchActivity?: AgentSearchActivity[];
  generatedWithWebSearch?: boolean;
  shortcutUpdate?: any;
  usage?: any;
  error?: string;
}

export async function chatWithAI(
  model: AIModel,
  message: string,
  conversationHistory: Array<{type: string; content: string}> = [],
  userId: string = 'anonymous',
  reasoningOptions?: ReasoningOptions,
  onActivityUpdate?: (activity: AgentSearchActivity) => void
): Promise<ChatResponse> {
  if (!checkRateLimit(userId)) {
    return { response: '', error: 'Rate limit exceeded. Please try again later.' };
  }

  try {
    const result = await postData('/api/chat', {
      model,
      message,
      conversationHistory,
      userId,
      reasoningOptions
      // Removed API keys - server handles authentication
    });
    
    // Notify client of search activities if callback provided
    if (onActivityUpdate && result.searchActivity) {
      result.searchActivity.forEach((activity: AgentSearchActivity) => {
        onActivityUpdate(activity);
      });
    }
    
    return result;
  } catch (error) {
    return {
      response: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      searchActivity: [],
      generatedWithWebSearch: false
    };
  }
}
