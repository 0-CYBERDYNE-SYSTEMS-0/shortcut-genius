// Smart Selector for Knowledge Base
// Selects relevant shortcut examples based on user request

import { ShortcutKnowledgeBase } from './knowledge-base';

export interface SelectionCriteria {
  userRequest: string;
  preferredComplexity?: 'simple' | 'medium' | 'complex' | 'auto';
  maxExamples?: number;
  requireExampleFlag?: boolean;
}

export interface ScoredShortcut extends ShortcutKnowledgeBase {
  score: number;
  complexityMatch: number;
  actionOverlap: number;
  appOverlap: number;
  exampleBonus: number;
  usageBonus: number;
}

export interface SelectionResult {
  examples: ShortcutKnowledgeBase[];
  total_shortcuts: number;
  selection_criteria: SelectionCriteria;
  scores: ScoredShortcut[];
}

/**
 * Main selection function
 */
export async function selectRelevantExamples(
  knowledgeBase: ShortcutKnowledgeBase[],
  criteria: SelectionCriteria
): Promise<SelectionResult> {
  const {
    userRequest,
    preferredComplexity = 'auto',
    maxExamples = 5,
    requireExampleFlag = false
  } = criteria;

  // Step 1: Extract keywords from user request
  const keywords = extractKeywords(userRequest);
  
  // Step 2: Estimate complexity of user request
  const estimatedComplexity = estimateComplexity(userRequest);
  
  // Step 3: Filter knowledge base
  let filteredKB = knowledgeBase;

  // Filter by example flag if required
  if (requireExampleFlag) {
    filteredKB = filteredKB.filter(s => s.is_example);
  }

  // Filter by complexity preference
  if (preferredComplexity !== 'auto') {
    const complexityRange = getComplexityRange(preferredComplexity);
    filteredKB = filteredKB.filter(s =>
      s.complexity_score >= complexityRange.min &&
      s.complexity_score <= complexityRange.max
    );
  }

  // Step 4: Score each shortcut
  const scored = filteredKB.map(shortcut => {
    return scoreShortcut(
      shortcut,
      keywords,
      estimatedComplexity,
      preferredComplexity
    );
  });

  // Step 5: Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Step 6: Return top N examples
  const topExamples = scored
    .slice(0, maxExamples)
    .map(s => ({
      ...s,
      score: undefined, // Remove score from returned examples
      complexityMatch: undefined,
      actionOverlap: undefined,
      appOverlap: undefined,
      exampleBonus: undefined,
      usageBonus: undefined
    }));

  return {
    examples: topExamples,
    total_shortcuts: knowledgeBase.length,
    selection_criteria: criteria,
    scores: scored
  };
}

/**
 * Score a single shortcut
 */
function scoreShortcut(
  shortcut: ShortcutKnowledgeBase,
  keywords: string[],
  estimatedComplexity: number,
  preferredComplexity: string
): ScoredShortcut {
  let score = 0;

  // 1. Complexity match (0-50 points)
  const complexityDiff = Math.abs(shortcut.complexity_score - estimatedComplexity);
  const complexityMatch = Math.max(0, 50 - complexityDiff);
  score += complexityMatch;

  // 2. Keyword overlap (0-30 points)
  const actionOverlap = calculateActionOverlap(shortcut, keywords);
  score += Math.min(30, actionOverlap * 10);

  // 3. App overlap (0-20 points)
  const appOverlap = calculateAppOverlap(shortcut, keywords);
  score += Math.min(20, appOverlap * 20);

  // 4. Example flag bonus (0-20 points)
  const exampleBonus = shortcut.is_example ? 20 : 0;
  score += exampleBonus;

  // 5. Usage bonus (0-10 points)
  const usageBonus = Math.min(10, shortcut.run_count);
  score += usageBonus;

  // 6. Quality score bonus (0-10 points)
  const qualityBonus = shortcut.quality_score ? shortcut.quality_score * 1 : 0;
  score += qualityBonus;

  return {
    ...shortcut,
    score,
    complexityMatch,
    actionOverlap: Math.min(30, actionOverlap * 10),
    appOverlap: Math.min(20, appOverlap * 20),
    exampleBonus,
    usageBonus
  };
}

/**
 * Extract keywords from user request
 */
function extractKeywords(userRequest: string): string[] {
  const keywords: string[] = [];

  // Action-related keywords
  const actionKeywords = [
    'http', 'api', 'request', 'post', 'get', 'put', 'delete',
    'text', 'input', 'variable', 'set', 'get', 'dictionary',
    'file', 'folder', 'path', 'download', 'upload',
    'notification', 'alert', 'speak', 'message',
    'date', 'time', 'calendar', 'schedule',
    'location', 'map', 'gps', 'coordinates',
    'image', 'photo', 'camera', 'url',
    'json', 'xml', 'parse', 'format',
    'if', 'else', 'repeat', 'loop', 'condition',
    'email', 'mail', 'send', 'compose'
  ];

  // App-related keywords
  const appKeywords = [
    'perplexity', 'grok', 'claude', 'chatgpt', 'gpt',
    'bear', 'notes', 'evernote', 'notion',
    'slack', 'discord', 'telegram', 'message',
    'github', 'git', 'repository',
    'twitter', 'x', 'tweet',
    'spotify', 'music', 'song'
  ];

  const lowerRequest = userRequest.toLowerCase();

  // Check for action keywords
  for (const keyword of actionKeywords) {
    if (lowerRequest.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Check for app keywords
  for (const keyword of appKeywords) {
    if (lowerRequest.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Remove duplicates
  return [...new Set(keywords)];
}

/**
 * Estimate complexity from user request
 */
function estimateComplexity(userRequest: string): number {
  const lowerRequest = userRequest.toLowerCase();
  let complexity = 10; // Base complexity

  // Complexity indicators
  const highComplexity = [
    'api', 'http', 'webhook', 'multiple', 'repeat', 'loop',
    'condition', 'if', 'else', 'variable', 'dictionary',
    'parse', 'format', 'transform', 'array', 'object',
    'integration', 'connect', 'sync', 'database'
  ];

  const mediumComplexity = [
    'text', 'file', 'folder', 'notification',
    'message', 'email', 'calendar', 'date',
    'url', 'link', 'image', 'photo'
  ];

  // Count complexity indicators
  for (const indicator of highComplexity) {
    if (lowerRequest.includes(indicator)) {
      complexity += 10;
    }
  }

  for (const indicator of mediumComplexity) {
    if (lowerRequest.includes(indicator)) {
      complexity += 5;
    }
  }

  // Adjust for length
  const words = userRequest.split(/\s+/).length;
  complexity += Math.min(10, words * 0.5);

  return Math.min(100, Math.max(1, complexity));
}

/**
 * Get complexity range based on preference
 */
function getComplexityRange(preference: string): { min: number; max: number } {
  switch (preference) {
    case 'simple':
      return { min: 1, max: 10 };
    case 'medium':
      return { min: 10, max: 30 };
    case 'complex':
      return { min: 30, max: 100 };
    default:
      return { min: 1, max: 100 };
  }
}

/**
 * Calculate action keyword overlap
 */
function calculateActionOverlap(
  shortcut: ShortcutKnowledgeBase,
  keywords: string[]
): number {
  const actions = shortcut.actions || [];
  
  // Build set of action identifiers
  const actionIdentifiers = new Set<string>();
  for (const action of actions) {
    const identifier = action.identifier || action.WFWorkflowActionIdentifier || '';
    const lower = identifier.toLowerCase();
    actionIdentifiers.add(lower);
    
    // Also check for action type parts
    const parts = identifier.split('.');
    for (const part of parts) {
      actionIdentifiers.add(part.toLowerCase());
    }
  }

  // Count keyword matches
  let matches = 0;
  for (const keyword of keywords) {
    for (const identifier of actionIdentifiers) {
      if (identifier.includes(keyword) || keyword.includes(identifier)) {
        matches++;
        break;
      }
    }
  }

  // Return as ratio (0-1)
  return keywords.length > 0 ? matches / keywords.length : 0;
}

/**
 * Calculate app keyword overlap
 */
function calculateAppOverlap(
  shortcut: ShortcutKnowledgeBase,
  keywords: string[]
): number {
  const thirdPartyApps = shortcut.third_party_integrations || [];
  
  // Build set of app bundle IDs
  const appIdentifiers = new Set<string>();
  for (const app of thirdPartyApps) {
    const lower = app.toLowerCase();
    appIdentifiers.add(lower);
    
    // Also check for app name parts
    const parts = app.split('.');
    for (const part of parts) {
      appIdentifiers.add(part.toLowerCase());
    }
  }

  // Count keyword matches
  let matches = 0;
  for (const keyword of keywords) {
    for (const identifier of appIdentifiers) {
      if (identifier.includes(keyword) || keyword.includes(identifier)) {
        matches++;
        break;
      }
    }
  }

  // Return as ratio (0-1)
  return keywords.length > 0 ? matches / keywords.length : 0;
}

/**
 * Get explanation of selection
 */
export function explainSelection(
  result: SelectionResult
): string {
  const { examples, selection_criteria, scores } = result;

  if (examples.length === 0) {
    return `No matching shortcuts found in knowledge base.\n\nSelection criteria:\n- Keywords: ${extractKeywords(selection_criteria.userRequest).join(', ')}\n- Complexity preference: ${selection_criteria.preferredComplexity}`;
  }

  const topExample = examples[0];
  const topScore = scores.find(s => s.id === topExample.id);

  return `Selected ${examples.length} relevant shortcut(s) from ${result.total_shortcuts} total.\n\nTop example: ${topExample.shortcut_name} (${topExample.action_count} actions)\nScore breakdown:\n- Complexity match: ${topScore?.complexityMatch || 0}/50\n- Action overlap: ${topScore?.actionOverlap || 0}/30\n- App overlap: ${topScore?.appOverlap || 0}/20\n- Example bonus: ${topScore?.exampleBonus || 0}/20\n- Usage bonus: ${topScore?.usageBonus || 0}/10\n\nTotal score: ${topScore?.score || 0}`;
}
