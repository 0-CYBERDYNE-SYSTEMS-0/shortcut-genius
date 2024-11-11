import { AIModel, AIResponse } from './types';
import { postData } from './fetcher';
import { AI_CONFIG } from './constants';

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
  userId: string
): Promise<AIResponse> {
  if (!checkRateLimit(userId)) {
    return { content: '', error: 'Rate limit exceeded. Please try again later.' };
  }

  try {
    const result = await postData('/api/process', { 
      model, 
      prompt,
      apiKeys: {
        openai: AI_CONFIG.OPENAI_API_KEY,
        anthropic: AI_CONFIG.ANTHROPIC_API_KEY
      }
    });
    return result;
  } catch (error) {
    return { 
      content: '', 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}
