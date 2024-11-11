// AI Models available for shortcut processing
export type AIModel = 'gpt-4o' | 'claude-3-sonnet';

export interface AIResponse {
  content: string;
  error?: string;
}
