import { OpenRouterModel } from './types';

export interface OpenRouterModelsResponse {
  models: OpenRouterModel[];
  categorized: Record<string, OpenRouterModel[]>;
  total: number;
  lastUpdated: string;
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModelsResponse> {
  try {
    const response = await fetch('/api/models/openrouter');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    throw error;
  }
}

export async function searchOpenRouterModels(query: string): Promise<{ models: OpenRouterModel[]; query: string; total: number }> {
  try {
    const response = await fetch(`/api/models/openrouter/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to search OpenRouter models:', error);
    throw error;
  }
}

export async function getOpenRouterModelDetails(modelId: string): Promise<OpenRouterModel> {
  try {
    const response = await fetch(`/api/models/openrouter/${encodeURIComponent(modelId)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get OpenRouter model details:', error);
    throw error;
  }
}