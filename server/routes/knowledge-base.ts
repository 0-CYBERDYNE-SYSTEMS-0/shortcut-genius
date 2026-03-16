// Knowledge Base API Routes
// Handles upload, list, delete, and flag operations

import type { Express } from 'express';
import { Request, Response } from 'express';
import * as KB from '../knowledge-base';
import * as Selector from './knowledge-base-selector';

/**
 * POST /api/knowledge-base/upload
 * Upload shortcuts JSON file and import into knowledge base
 */
export async function uploadKnowledgeBase(req: Request, res: Response) {
  try {
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    const shortcuts = req.body; // Array of shortcut objects

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in to upload shortcuts'
      });
    }

    if (!Array.isArray(shortcuts)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request body must be an array of shortcuts'
      });
    }

    // Validate each shortcut
    const validationErrors: string[] = [];
    for (let i = 0; i < shortcuts.length; i++) {
      const shortcut = shortcuts[i];

      if (!shortcut.shortcut_name) {
        validationErrors.push(`Shortcut ${i + 1}: Missing shortcut_name`);
      }
      if (!Array.isArray(shortcut.actions)) {
        validationErrors.push(`Shortcut ${i + 1}: Missing or invalid actions array`);
      }
      if (!shortcut.action_count || typeof shortcut.action_count !== 'number') {
        validationErrors.push(`Shortcut ${i + 1}: Missing or invalid action_count`);
      }
      if (!shortcut.complexity_score || typeof shortcut.complexity_score !== 'number') {
        validationErrors.push(`Shortcut ${i + 1}: Missing or invalid complexity_score`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }

    // Import shortcuts
    const imported = await KB.importShortcuts(userId, shortcuts);

    res.status(201).json({
      success: true,
      imported: imported.length,
      shortcuts: imported,
      message: `Successfully imported ${imported.length} shortcuts`
    });
  } catch (error) {
    console.error('Error uploading knowledge base:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to import shortcuts'
    });
  }
}

/**
 * GET /api/knowledge-base
 * List user's knowledge base shortcuts with optional filters
 */
export async function getKnowledgeBase(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const {
      tags,
      complexity_min,
      complexity_max,
      is_example
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in to view knowledge base'
      });
    }

    // Build filters
    const filters: any = {};
    
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }
    
    if (complexity_min) {
      filters.complexity_min = parseInt(complexity_min as string);
    }
    
    if (complexity_max) {
      filters.complexity_max = parseInt(complexity_max as string);
    }
    
    if (is_example !== undefined) {
      filters.is_example = is_example === 'true';
    }

    // Get shortcuts
    const shortcuts = await KB.getUserKnowledgeBase(userId, filters);

    res.json({
      success: true,
      count: shortcuts.length,
      shortcuts
    });
  } catch (error) {
    console.error('Error getting knowledge base:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve shortcuts'
    });
  }
}

/**
 * GET /api/knowledge-base/stats
 * Get statistics about user's knowledge base
 */
export async function getKnowledgeBaseStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in to view knowledge base'
      });
    }

    const stats = await KB.getKnowledgeBaseStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve statistics'
    });
  }
}

/**
 * GET /api/knowledge-base/:id
 * Get a specific shortcut by ID
 */
export async function getShortcutById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in'
      });
    }

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID must be a valid number'
      });
    }

    const shortcut = await KB.getShortcutById(id);

    if (!shortcut) {
      return res.status(404).json({
        error: 'Not found',
        message: `Shortcut with ID ${id} not found`
      });
    }

    // Verify ownership
    if (shortcut.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this shortcut'
      });
    }

    res.json({
      success: true,
      shortcut
    });
  } catch (error) {
    console.error('Error getting shortcut:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve shortcut'
    });
  }
}

/**
 * DELETE /api/knowledge-base/:id
 * Delete a shortcut from knowledge base
 */
export async function deleteShortcut(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in'
      });
    }

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID must be a valid number'
      });
    }

    // Verify ownership
    const shortcut = await KB.getShortcutById(id);
    if (!shortcut) {
      return res.status(404).json({
        error: 'Not found',
        message: `Shortcut with ID ${id} not found`
      });
    }

    if (shortcut.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this shortcut'
      });
    }

    // Delete shortcut
    const success = await KB.deleteShortcut(id);

    if (success) {
      res.json({
        success: true,
        message: 'Shortcut deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete shortcut'
      });
    }
  } catch (error) {
    console.error('Error deleting shortcut:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete shortcut'
    });
  }
}

/**
 * PUT /api/knowledge-base/:id/flag
 * Update shortcut example flag and quality score
 */
export async function flagShortcut(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id);
    const { is_example, quality_score } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in'
      });
    }

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID must be a valid number'
      });
    }

    if (typeof is_example !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'is_example must be a boolean'
      });
    }

    if (quality_score !== undefined) {
      if (typeof quality_score !== 'number' || quality_score < 1 || quality_score > 10) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'quality_score must be a number between 1 and 10'
        });
      }
    }

    // Verify ownership
    const shortcut = await KB.getShortcutById(id);
    if (!shortcut) {
      return res.status(404).json({
        error: 'Not found',
        message: `Shortcut with ID ${id} not found`
      });
    }

    if (shortcut.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify this shortcut'
      });
    }

    // Update flag
    const success = await KB.flagShortcut(id, is_example, quality_score);

    if (success) {
      const updatedShortcut = await KB.getShortcutById(id);
      res.json({
        success: true,
        message: 'Shortcut updated successfully',
        shortcut: updatedShortcut
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update shortcut'
      });
    }
  } catch (error) {
    console.error('Error flagging shortcut:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update shortcut'
    });
  }
}

/**
 * POST /api/knowledge-base/select
 * Select relevant examples based on user request
 */
export async function selectExamples(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const {
      userRequest,
      preferredComplexity = 'auto',
      maxExamples = 5,
      requireExampleFlag = false
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be logged in'
      });
    }

    if (!userRequest || typeof userRequest !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'userRequest is required and must be a string'
      });
    }

    // Get user's knowledge base
    const knowledgeBase = await KB.getUserKnowledgeBase(userId);

    if (knowledgeBase.length === 0) {
      return res.json({
        success: true,
        examples: [],
        message: 'No shortcuts in knowledge base. Upload shortcuts to enable example selection.'
      });
    }

    // Select relevant examples
    const result = await Selector.selectRelevantExamples(knowledgeBase, {
      userRequest,
      preferredComplexity,
      maxExamples,
      requireExampleFlag
    });

    res.json({
      success: true,
      selection: result
    });
  } catch (error) {
    console.error('Error selecting examples:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to select examples'
    });
  }
}

/**
 * Register all knowledge base routes
 */
export function registerKnowledgeBaseRoutes(app: Express) {
  console.log('📚 Registering knowledge base routes...');

  // POST /api/knowledge-base/upload
  app.post('/api/knowledge-base/upload', uploadKnowledgeBase);

  // GET /api/knowledge-base
  app.get('/api/knowledge-base', getKnowledgeBase);

  // GET /api/knowledge-base/stats
  app.get('/api/knowledge-base/stats', getKnowledgeBaseStats);

  // GET /api/knowledge-base/:id
  app.get('/api/knowledge-base/:id', getShortcutById);

  // DELETE /api/knowledge-base/:id
  app.delete('/api/knowledge-base/:id', deleteShortcut);

  // PUT /api/knowledge-base/:id/flag
  app.put('/api/knowledge-base/:id/flag', flagShortcut);

  // POST /api/knowledge-base/select
  app.post('/api/knowledge-base/select', selectExamples);

  console.log('✅ Knowledge base routes registered');
}
