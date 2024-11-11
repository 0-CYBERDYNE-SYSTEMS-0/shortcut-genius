// AI Models available for shortcut processing
export type AIModel = 'gpt-4o' | 'claude-3-5-sonnet-20241022';

export interface AIResponse {
  content: string;
  error?: string;
}
