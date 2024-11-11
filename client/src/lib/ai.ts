import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type AIModel = 'gpt-4o' | 'claude-3-5-sonnet-20241022';

export interface AIResponse {
  content: string;
  error?: string;
}

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
    if (model === 'gpt-4o') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      return { content: response.choices[0].message.content || '' };
    } else {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      return { content: response.content[0].text };
    }
  } catch (error) {
    return { 
      content: '', 
      error: `Error processing with ${model}: ${error.message}` 
    };
  }
}
