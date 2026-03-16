// Knowledge Base Management Module
// Stores and retrieves user's personal iOS Shortcuts for few-shot prompting

import { db } from '../db';

// Access the underlying pool for raw queries
const pool = db.$client;

export interface ShortcutKnowledgeBase {
  id: number;
  user_id: number;
  shortcut_name: string;
  workflow_id: string | null;
  action_count: number;
  run_count: number;
  trigger_count: number;
  complexity_score: number;
  app_bundle_identifier: string | null;
  source: string | null;
  gallery_identifier: string | null;
  actions: any[];
  action_sequence: string;
  parameters: Record<string, any>;
  variables: Record<string, any>;
  control_flow: Record<string, any>;
  third_party_integrations: any[];
  is_example: boolean;
  tags: string[];
  quality_score: number | null;
  created_at: Date;
  updated_at: Date;
  zdata_size: number | null;
  export_format: string | null;
  metadata: Record<string, any>;
}

export interface ShortcutInput {
  shortcut_name: string;
  workflow_id?: string;
  actions: any[];
  action_sequence: string;
  parameters?: Record<string, any>;
  variables?: Record<string, any>;
  control_flow?: Record<string, any>;
  third_party_integrations?: any[];
  app_bundle_identifier?: string;
  source?: string;
  action_count: number;
  run_count?: number;
  trigger_count?: number;
  complexity_score: number;
  tags?: string[];
  is_example?: boolean;
}

/**
 * Calculate complexity score based on action count and nested structures
 */
export function calculateComplexityScore(action_count: number, actions: any[]): number {
  let score = action_count;

  // Add complexity for nested structures
  for (const action of actions) {
    const params = action.parameters || action.WFWorkflowActionParameters || {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value !== null) {
        score += 2; // Nested parameter
      }
      if (Array.isArray(value)) {
        score += value.length; // Array length
      }
    }
  }

  // Normalize to 1-100 scale
  return Math.min(100, Math.max(1, Math.round(score)));
}

/**
 * Extract third-party integrations from actions
 */
export function extractThirdPartyIntegrations(actions: any[]): string[] {
  const integrations = new Set<string>();

  for (const action of actions) {
    const identifier = action.identifier || action.WFWorkflowActionIdentifier || '';
    if (identifier && !identifier.startsWith('is.workflow.actions.')) {
      // Extract app bundle ID from third-party action
      const parts = identifier.split('.');
      if (parts.length >= 2) {
        integrations.add(parts[0]); // First part is usually bundle ID
      }
    }
  }

  return Array.from(integrations);
}

/**
 * Generate action sequence string (comma-separated identifiers)
 */
export function generateActionSequence(actions: any[]): string {
  return actions
    .map(a => a.identifier || a.WFWorkflowActionIdentifier || 'unknown')
    .join(' -> ');
}

/**
 * Import shortcuts into knowledge base
 */
export async function importShortcuts(
  userId: number,
  shortcuts: ShortcutInput[]
): Promise<ShortcutKnowledgeBase[]> {
  const client = await pool.connect();

  try {
    const imported: ShortcutKnowledgeBase[] = [];

    for (const shortcut of shortcuts) {
      const result = await client.query(`
        INSERT INTO shortcut_knowledge_base (
          user_id,
          shortcut_name,
          workflow_id,
          action_count,
          run_count,
          trigger_count,
          complexity_score,
          app_bundle_identifier,
          source,
          actions,
          action_sequence,
          parameters,
          variables,
          control_flow,
          third_party_integrations,
          is_example,
          tags,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (user_id, workflow_id) 
        DO UPDATE SET
          action_count = EXCLUDED.action_count,
          run_count = EXCLUDED.run_count,
          complexity_score = EXCLUDED.complexity_score,
          actions = EXCLUDED.actions,
          parameters = EXCLUDED.parameters,
          third_party_integrations = EXCLUDED.third_party_integrations,
          is_example = EXCLUDED.is_example,
          tags = EXCLUDED.tags,
          updated_at = NOW()
        RETURNING *
      `, [
        userId,
        shortcut.shortcut_name,
        shortcut.workflow_id || null,
        shortcut.action_count,
        shortcut.run_count || 0,
        shortcut.trigger_count || 0,
        shortcut.complexity_score,
        shortcut.app_bundle_identifier || null,
        shortcut.source || null,
        JSON.stringify(shortcut.actions),
        shortcut.action_sequence,
        JSON.stringify(shortcut.parameters || {}),
        JSON.stringify(shortcut.variables || {}),
        JSON.stringify(shortcut.control_flow || {}),
        JSON.stringify(shortcut.third_party_integrations || []),
        shortcut.is_example || false,
        shortcut.tags || [],
        JSON.stringify({
          zdata_size: shortcut.metadata?.zdata_size,
          export_format: shortcut.export_format
        })
      ]);

      imported.push(result.rows[0]);
    }

    return imported;
  } finally {
    client.release();
  }
}

/**
 * Get user's knowledge base shortcuts
 */
export async function getUserKnowledgeBase(
  userId: number,
  filters?: {
    tags?: string[];
    complexity_min?: number;
    complexity_max?: number;
    is_example?: boolean;
  }
): Promise<ShortcutKnowledgeBase[]> {
  const client = await pool.connect();

  try {
    let query = `
      SELECT * FROM shortcut_knowledge_base
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (filters?.tags && filters.tags.length > 0) {
      query += ` AND tags && $${paramIndex}`;
      params.push(filters.tags);
      paramIndex++;
    }

    if (filters?.complexity_min !== undefined) {
      query += ` AND complexity_score >= $${paramIndex}`;
      params.push(filters.complexity_min);
      paramIndex++;
    }

    if (filters?.complexity_max !== undefined) {
      query += ` AND complexity_score <= $${paramIndex}`;
      params.push(filters.complexity_max);
      paramIndex++;
    }

    if (filters?.is_example !== undefined) {
      query += ` AND is_example = $${paramIndex}`;
      params.push(filters.is_example);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get a specific shortcut by ID
 */
export async function getShortcutById(id: number): Promise<ShortcutKnowledgeBase | null> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM shortcut_knowledge_base WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete a shortcut from knowledge base
 */
export async function deleteShortcut(id: number): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('DELETE FROM shortcut_knowledge_base WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting shortcut:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Update shortcut example flag and quality score
 */
export async function flagShortcut(
  id: number,
  isExample: boolean,
  qualityScore?: number
): Promise<boolean> {
  const client = await pool.connect();

  try {
    let query = `
      UPDATE shortcut_knowledge_base
      SET is_example = $1, updated_at = NOW()
    `;
    const params: any[] = [isExample];

    if (qualityScore !== undefined) {
      query += `, quality_score = $2`;
      params.push(qualityScore);
    }

    query += ` WHERE id = $${params.length + 1}`;
    params.push(id);

    await client.query(query, params);
    return true;
  } catch (error) {
    console.error('Error flagging shortcut:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeBaseStats(userId: number): Promise<{
  total_shortcuts: number;
  total_actions: number;
  example_count: number;
  complexity_distribution: Record<string, number>;
  third_party_apps: Array<{ app: string; count: number }>;
}> {
  const client = await pool.connect();

  try {
    // Basic counts
    const countResult = await client.query(`
      SELECT
        COUNT(*) as total_shortcuts,
        SUM(action_count) as total_actions,
        SUM(CASE WHEN is_example THEN 1 ELSE 0 END) as example_count
      FROM shortcut_knowledge_base
      WHERE user_id = $1
    `, [userId]);

    // Complexity distribution
    const complexityResult = await client.query(`
      SELECT
        CASE
          WHEN complexity_score < 10 THEN 'simple'
          WHEN complexity_score < 30 THEN 'medium'
          ELSE 'complex'
        END as category,
        COUNT(*) as count
      FROM shortcut_knowledge_base
      WHERE user_id = $1
      GROUP BY category
    `, [userId]);

    // Third-party app counts
    const appsResult = await client.query(`
      SELECT
        jsonb_array_elements_text(third_party_integrations) as app,
        COUNT(*) as count
      FROM shortcut_knowledge_base
      WHERE user_id = $1
        AND third_party_integrations != '[]'::jsonb
      GROUP BY app
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);

    return {
      total_shortcuts: countResult.rows[0].total_shortcuts || 0,
      total_actions: parseInt(countResult.rows[0].total_actions || '0'),
      example_count: countResult.rows[0].example_count || 0,
      complexity_distribution: complexityResult.rows.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {} as Record<string, number>),
      third_party_apps: appsResult.rows
    };
  } finally {
    client.release();
  }
}
