// AI Models - API keys handled server-side only
// export const AI_CONFIG = {
//   // API keys moved to server-side for security
// };

// Rate limiting
export const RATE_LIMIT = {
  WINDOW: 60000, // 1 minute
  MAX_REQUESTS: 10,
};

// Model information
export const MODEL_INFO = {
  "gpt-4o": {
    provider: "openai",
    name: "GPT-4o",
    description: "Latest OpenAI model with enhanced capabilities",
  },
  "claude-3-5-sonnet-20241022": {
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    description: "Latest Anthropic model with enhanced capabilities",
  },
};
