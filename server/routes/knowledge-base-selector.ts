/**
 * Knowledge Base Selector
 * Selects relevant examples from user's knowledge base for few-shot prompting
 */

import type { ShortcutKnowledgeBase } from '../knowledge-base';

export interface SelectionOptions {
  userRequest: string;
  preferredComplexity: 'auto' | 'simple' | 'medium' | 'complex';
  maxExamples: number;
  requireExampleFlag: boolean;
}

export interface SelectionResult {
  examples: SelectedExample[];
  totalAvailable: number;
  selectionCriteria: {
    complexity: string;
    keywordMatches: string[];
    actionTypes: string[];
  };
}

export interface SelectedExample {
  id: string;
  shortcut_name: string;
  description?: string;
  actions: any[];
  action_count: number;
  complexity_score: number;
  relevance_score: number;
  tags?: string[];
  is_example: boolean;
}

/**
 * Select relevant examples from knowledge base based on user request
 */
export async function selectRelevantExamples(
  knowledgeBase: ShortcutKnowledgeBase[],
  options: SelectionOptions
): Promise<SelectionResult> {
  const { userRequest, preferredComplexity, maxExamples, requireExampleFlag } = options;

  // Filter by example flag if required
  let candidates = requireExampleFlag
    ? knowledgeBase.filter(s => s.is_example)
    : [...knowledgeBase];

  // Calculate relevance scores
  const scored = candidates.map(shortcut => ({
    ...shortcut,
    relevance_score: calculateRelevanceScore(shortcut, userRequest)
  }));

  // Filter by complexity preference
  if (preferredComplexity !== 'auto') {
    const complexityRanges = {
      simple: { min: 0, max: 3 },
      medium: { min: 3, max: 6 },
      complex: { min: 6, max: Infinity }
    };
    const range = complexityRanges[preferredComplexity];
    candidates = scored.filter(s =>
      s.complexity_score >= range.min && s.complexity_score < range.max
    );
  } else {
    candidates = scored;
  }

  // Sort by relevance score (highest first)
  candidates.sort((a, b) => b.relevance_score - a.relevance_score);

  // Take top N examples
  const selected = candidates.slice(0, maxExamples);

  // Extract keywords and action types for criteria
  const keywords = extractKeywords(userRequest);
  const actionTypes = extractActionTypes(selected);

  return {
    examples: selected.map(s => ({
      id: String(s.id),
      shortcut_name: s.shortcut_name,
      description: undefined,
      actions: s.actions,
      action_count: s.action_count,
      complexity_score: s.complexity_score,
      relevance_score: (s as any).relevance_score || 0,
      tags: s.tags,
      is_example: s.is_example
    })),
    totalAvailable: knowledgeBase.length,
    selectionCriteria: {
      complexity: preferredComplexity,
      keywordMatches: keywords,
      actionTypes
    }
  };
}

/**
 * Calculate relevance score between a shortcut and user request
 */
function calculateRelevanceScore(shortcut: ShortcutKnowledgeBase, userRequest: string): number {
  let score = 0;
  const requestLower = userRequest.toLowerCase();
  const nameLower = shortcut.shortcut_name.toLowerCase();
  const descLower = shortcut.description?.toLowerCase() || '';

  // Name match (high weight)
  if (nameLower.includes(requestLower) || requestLower.includes(nameLower)) {
    score += 10;
  }

  // Word overlap
  const requestWords = new Set(requestLower.split(/\s+/));
  const nameWords = nameLower.split(/\s+/);
  const descWords = descLower.split(/\s+/);

  for (const word of requestWords) {
    if (word.length > 2) {
      if (nameWords.includes(word)) score += 3;
      if (descWords.includes(word)) score += 2;
    }
  }

  // Tag matches
  if (shortcut.tags) {
    for (const tag of shortcut.tags) {
      if (requestLower.includes(tag.toLowerCase())) {
        score += 2;
      }
    }
  }

  // Action type relevance
  const actionTypes = shortcut.actions.map(a => a.type?.toLowerCase() || '');
  const commonActions = ['notification', 'text', 'if', 'repeat', 'url'];
  for (const action of actionTypes) {
    if (requestLower.includes(action)) score += 1;
    if (commonActions.includes(action)) score += 0.5;
  }

  // Boost examples flagged as good examples
  if (shortcut.is_example) {
    score += 2;
  }

  return score;
}

/**
 * Extract keywords from user request
 */
function extractKeywords(userRequest: string): string[] {
  const words = userRequest.toLowerCase().split(/\s+/);
  return words.filter(w => w.length > 3 && !isStopWord(w));
}

/**
 * Extract action types from selected examples
 */
function extractActionTypes(examples: ShortcutKnowledgeBase[]): string[] {
  const types = new Set<string>();
  for (const ex of examples) {
    for (const action of ex.actions) {
      if (action.type) {
        types.add(action.type);
      }
    }
  }
  return Array.from(types).slice(0, 10);
}

/**
 * Common stop words to filter out
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'create', 'make', 'build', 'shortcut', 'that', 'with', 'for', 'the',
    'and', 'from', 'using', 'use', 'add', 'get', 'set', 'this', 'have'
  ]);
  return stopWords.has(word);
}
