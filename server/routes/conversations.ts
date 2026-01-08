import type { Express } from 'express';
import { db } from '../../db';
import { conversations, messages, shortcutVersions, userPreferences } from '../../db/schema';
import { ConversationalShortcutAgent } from '../conversational-agent';
import { AIModel } from '../../client/src/lib/types';
import { validateShortcut } from '../../client/src/lib/shortcuts';
import { analyzeShortcut } from '../../client/src/lib/shortcut-analyzer';
import { responseCache } from '../cache';
import { openAICircuitBreaker, anthropicCircuitBreaker } from '../circuit-breaker';
import { modelRouter } from '../model-router';
import { AgentLogger } from '../agents/base/agent-logger';
import { sql, eq, and, or, ilike, desc } from 'drizzle-orm';

export function registerConversationRoutes(app: Express, conversationalAgent: ConversationalShortcutAgent) {
  // POST /api/conversations/create - Create new conversation
  app.post('/api/conversations/create', async (req, res) => {
    const { userId, title, initialPrompt, model = 'gpt-4o' } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    if (!title) {
      return res.status(400).json({
        error: 'Missing required field: title'
      });
    }

    try {
      // Create conversation in database
      const [conversation] = await db.insert(conversations)
        .values({
          userId,
          title,
          metadata: { model, createdAt: new Date().toISOString() },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (initialPrompt) {
        // Add initial user message
        await db.insert(messages).values({
          conversationId: conversation.id,
          role: 'user',
          content: initialPrompt,
          timestamp: new Date(),
          metadata: { model }
        });
      }

      res.status(201).json({
        success: true,
        id: conversation.id,
        message: 'Conversation created successfully'
      });

    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        error: 'Failed to create conversation',
        details: error.message
      });
    }
  });

  // GET /api/conversations/:id - Get conversation details
  app.get('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      const [conversation] = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          userId: conversations.userId,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          metadata: conversations.metadata,
          messageCount: sql<number>`count(${messages.id})`.mapWith(Number)
        })
        .from(conversations)
        .leftJoin(messages, eq(conversations.id, messages.conversationId))
        .where(eq(conversations.id, conversationId))
        .groupBy(conversations.id)
        .limit(1);

      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Get messages for this conversation
      const messageList = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.timestamp);

      res.json({
        conversation,
        messages: messageList
      });

    } catch (error: any) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to get conversation',
        details: error.message
      });
    }
  });

  // GET /api/conversations - List user conversations
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const conversationList = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          userId: conversations.userId,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          metadata: conversations.metadata,
          messageCount: sql<number>`count(${messages.id})`.mapWith(Number)
        })
        .from(conversations)
        .leftJoin(messages, eq(conversations.id, messages.conversationId))
        .where(eq(conversations.userId, userId))
        .groupBy(conversations.id)
        .orderBy(desc(conversations.updatedAt))
        .limit(limit)
        .offset(offset);

      res.json(conversationList);

    } catch (error: any) {
      console.error('List conversations error:', error);
      res.status(500).json({
        error: 'Failed to list conversations',
        details: error.message
      });
    }
  });

  // DELETE /api/conversations/:id - Delete conversation
  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      // Delete messages first
      await db.delete(messages).where(eq(messages.conversationId, conversationId));

      // Delete conversation
      await db.delete(conversations).where(eq(conversations.id, conversationId));

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });

    } catch (error: any) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        error: 'Failed to delete conversation',
        details: error.message
      });
    }
  });

  // POST /api/conversations/:id/clear - Clear all messages in a conversation
  app.post('/api/conversations/:id/clear', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      // Delete all messages
      await db.delete(messages).where(eq(messages.conversationId, conversationId));

      res.json({
        success: true,
        message: 'Conversation cleared successfully'
      });

    } catch (error: any) {
      console.error('Clear conversation error:', error);
      res.status(500).json({
        error: 'Failed to clear conversation',
        details: error.message
      });
    }
  });

  // POST /api/conversations/:id/messages - Send a message
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, model = 'gpt-4o', reasoningOptions = {} } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      const [conversation] = await db
        .select({ userId: conversations.userId })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Add user message
      const [userMessage] = await db.insert(messages)
        .values({
          conversationId,
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
          metadata: { model, reasoningOptions }
        })
        .returning();

      // Process with AI
      const keyStatus = conversationalAgent.checkApiKeyAvailability(model);
      if (!keyStatus.available) {
        return res.status(400).json({
          error: keyStatus.error || 'Model API key not configured'
        });
      }

      const aiResponse = await conversationalAgent.processRequest({
        conversationId,
        userId: conversation.userId,
        content: content.trim(),
        model,
        type: 'generate',
        reasoningOptions,
        persistMessages: false
      });

      // Add assistant message
      const [assistantMessage] = await db.insert(messages)
        .values({
          conversationId,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: {
            model,
            phase: aiResponse.phase?.type || aiResponse.phase,
            shortcut: aiResponse.shortcut,
            analysis: aiResponse.analysis,
            nextActions: aiResponse.nextActions
          }
        })
        .returning();

      await db.update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      res.json({
        success: true,
        id: assistantMessage.id,
        content: aiResponse.content,
        phase: aiResponse.phase,
        model,
        shortcut: aiResponse.shortcut,
        analysis: aiResponse.analysis,
        nextActions: aiResponse.nextActions,
        timestamp: assistantMessage.timestamp
      });

    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({
        error: 'Failed to send message',
        details: error.message
      });
    }
  });

  // GET /api/conversations/search - Search conversations
  app.get('/api/conversations/search', async (req, res) => {
    try {
      const query = req.query.query as string || '';
      const userId = parseInt(req.query.userId as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      if (!query.trim()) {
        return res.status(400).json({
          error: 'Missing required parameters: query'
        });
      }

      const results = await db
        .select({
          conversationId: conversations.id,
          title: conversations.title,
          lastMessageContent: messages.content,
          messageCount: sql<number>`count(${messages.id})`.mapWith(Number),
          updatedAt: conversations.updatedAt,
          createdAt: conversations.createdAt
        })
        .from(conversations)
        .leftJoin(messages, eq(conversations.id, messages.conversationId))
        .where(
          and(
            eq(conversations.userId, userId),
            or(
              ilike(conversations.title, `%${query}%`),
              ilike(messages.content, `%${query}%`)
            )
          )
        )
        .groupBy(conversations.id)
        .limit(limit)
        .offset(offset);

      const searchResults = results.map(row => ({
        id: row.conversationId,
        title: row.title,
        last_message: row.lastMessageContent,
        message_count: row.messageCount,
        updated_at: row.updatedAt,
        created_at: row.createdAt
      }));

      res.json({
        results: searchResults,
        query,
        total: searchResults.length,
        limit,
        offset
      });

    } catch (error: any) {
      console.error('Search conversations error:', error);
      res.status(500).json({
        error: 'Failed to search conversations',
        details: error.message
      });
    }
  });

  // GET /api/conversations/:id/stream - Server-sent events for real-time updates
  app.get('/api/conversations/:id/stream', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (!conversationId) {
        return res.status(400).json({
          error: 'Conversation ID is required for streaming'
        });
      }

      // Set up event streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-ID': conversationId.toString()
      });

      // Simple heartbeat for now
      const heartbeat = setInterval(() => {
        res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected', conversationId })}\n\n`);

    } catch (error: any) {
      console.error('SSE streaming error:', error);
      return res.status(500).json({
        error: `Streaming failed: ${error.message}`
      });
    }
  });

  console.log('✅ Conversation routes registered successfully');
}
