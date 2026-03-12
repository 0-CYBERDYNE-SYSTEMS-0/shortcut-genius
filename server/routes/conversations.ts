import type { Express, Request, Response } from 'express';
import { db } from '../../db';
import { conversations, messages, shortcutVersions, userPreferences, users } from '../../db/schema';
import { ConversationalShortcutAgent } from '../conversational-agent';
import { AIModel } from '../../client/src/lib/types';
import { validateShortcut } from '../../client/src/lib/shortcuts';
import { analyzeShortcut } from '../../client/src/lib/shortcut-analyzer';
import { responseCache } from '../cache';
import { openAICircuitBreaker, anthropicCircuitBreaker } from '../circuit-breaker';
import { modelRouter } from '../model-router';
import { AgentLogger } from '../agents/base/agent-logger';
import { sql, eq, and, or, ilike, desc } from 'drizzle-orm';

const DEFAULT_CONVERSATION_USER_ID = 1;
const DEFAULT_CONVERSATION_USERNAME = '__conversation_store_default_user__';
const DEFAULT_CONVERSATION_PASSWORD = '__conversation_store_placeholder__';

class ConversationRouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function resolveConversationUserId(req: Request): number {
  const fromBody = typeof req.body?.userId === 'number' ? req.body.userId : Number.parseInt(String(req.body?.userId ?? ''), 10);
  const fromQuery = Number.parseInt(String(req.query.userId ?? ''), 10);
  const fromHeader = Number.parseInt(String(req.header('x-user-id') ?? ''), 10);

  return [fromBody, fromQuery, fromHeader].find((value) => Number.isInteger(value) && value > 0) || DEFAULT_CONVERSATION_USER_ID;
}

function requireConversationId(req: Request): number {
  const conversationId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new ConversationRouteError(400, 'Conversation ID is required');
  }

  return conversationId;
}

async function ensureConversationUserExists(userId: number): Promise<number> {
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser) {
    return userId;
  }

  if (userId !== DEFAULT_CONVERSATION_USER_ID) {
    throw new ConversationRouteError(404, 'User not found');
  }

  await db.execute(sql`
    INSERT INTO users (id, username, password)
    OVERRIDING SYSTEM VALUE
    VALUES (${DEFAULT_CONVERSATION_USER_ID}, ${DEFAULT_CONVERSATION_USERNAME}, ${DEFAULT_CONVERSATION_PASSWORD})
    ON CONFLICT DO NOTHING
  `);

  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('users', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1),
      true
    )
  `);

  const [seededUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!seededUser) {
    throw new ConversationRouteError(500, 'Failed to provision default conversation user');
  }

  return userId;
}

async function ensureOwnedConversation(conversationId: number, userId: number) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      metadata: conversations.metadata
    })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  if (!conversation) {
    throw new ConversationRouteError(404, 'Conversation not found');
  }

  return conversation;
}

function sendConversationError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof ConversationRouteError) {
    return res.status(error.status).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return res.status(500).json({
    error: fallbackMessage,
    details: message
  });
}

export function registerConversationRoutes(app: Express, conversationalAgent: ConversationalShortcutAgent) {
  const writeStreamEvent = (res: any, type: string, data: any) => {
    res.write(`${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n`);
  };

  // POST /api/conversations/create - Create new conversation
  app.post('/api/conversations/create', async (req, res) => {
    const requestedUserId = resolveConversationUserId(req);
    const { title, initialPrompt, model = 'gpt-4o' } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        error: 'Missing required field: title'
      });
    }

    try {
      const userId = await ensureConversationUserExists(requestedUserId);

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
      return sendConversationError(res, error, 'Failed to create conversation');
    }
  });

  // GET /api/conversations/:id - Get conversation details
  app.get('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = requireConversationId(req);
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));

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
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
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
      return sendConversationError(res, error, 'Failed to get conversation');
    }
  });

  // GET /api/conversations - List user conversations
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));
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
      return sendConversationError(res, error, 'Failed to list conversations');
    }
  });

  // DELETE /api/conversations/:id - Delete conversation
  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = requireConversationId(req);
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));

      await ensureOwnedConversation(conversationId, userId);

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
      return sendConversationError(res, error, 'Failed to delete conversation');
    }
  });

  // POST /api/conversations/:id/clear - Clear all messages in a conversation
  app.post('/api/conversations/:id/clear', async (req, res) => {
    try {
      const conversationId = requireConversationId(req);
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));

      await ensureOwnedConversation(conversationId, userId);

      // Delete all messages
      await db.delete(messages).where(eq(messages.conversationId, conversationId));

      res.json({
        success: true,
        message: 'Conversation cleared successfully'
      });

    } catch (error: any) {
      console.error('Clear conversation error:', error);
      return sendConversationError(res, error, 'Failed to clear conversation');
    }
  });

  // POST /api/conversations/:id/messages - Send a message
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = requireConversationId(req);
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));
      const { content, model = 'gpt-4o', reasoningOptions = {} } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      const conversation = await ensureOwnedConversation(conversationId, userId);

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
      return sendConversationError(res, error, 'Failed to send message');
    }
  });

  // POST /api/conversations/:id/messages/stream - stream message processing phases and final response
  app.post('/api/conversations/:id/messages/stream', async (req, res) => {
    const conversationId = Number.parseInt(req.params.id, 10);
    const { content, model = 'gpt-4o', reasoningOptions = {} } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        throw new ConversationRouteError(400, 'Conversation ID is required');
      }

      const userId = await ensureConversationUserExists(resolveConversationUserId(req));
      const conversation = await ensureOwnedConversation(conversationId, userId);

      const [userMessage] = await db.insert(messages)
        .values({
          conversationId,
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
          metadata: { model, reasoningOptions }
        })
        .returning();

      const keyStatus = conversationalAgent.checkApiKeyAvailability(model);
      if (!keyStatus.available) {
        writeStreamEvent(res, 'error', {
          error: keyStatus.error || 'Model API key not configured'
        });
        return res.end();
      }

      writeStreamEvent(res, 'phase', {
        phase: 'analysis',
        message: 'Understanding your shortcut request...'
      });
      writeStreamEvent(res, 'phase', {
        phase: 'research',
        message: 'Researching actions and constraints...'
      });
      writeStreamEvent(res, 'phase', {
        phase: 'implementation',
        message: 'Building your shortcut...'
      });

      const aiResponse = await conversationalAgent.processRequest({
        conversationId,
        userId: conversation.userId,
        content: content.trim(),
        model,
        type: 'generate',
        reasoningOptions,
        persistMessages: false
      });

      writeStreamEvent(res, 'phase', {
        phase: 'validation',
        message: 'Validating output and preparing response...'
      });

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

      writeStreamEvent(res, 'result', {
        success: true,
        id: assistantMessage.id,
        userMessage,
        assistantMessage,
        content: aiResponse.content,
        phase: aiResponse.phase,
        model,
        shortcut: aiResponse.shortcut,
        analysis: aiResponse.analysis,
        nextActions: aiResponse.nextActions,
        requiresClarification: aiResponse.requiresClarification,
        timestamp: assistantMessage.timestamp
      });

      return res.end();
    } catch (error: any) {
      writeStreamEvent(res, 'error', {
        error: error instanceof ConversationRouteError ? error.message : error.message || 'Failed to stream message'
      });
      return res.end();
    }
  });

  // GET /api/conversations/search - Search conversations
  app.get('/api/conversations/search', async (req, res) => {
    try {
      const query = req.query.query as string || '';
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));
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
      return sendConversationError(res, error, 'Failed to search conversations');
    }
  });

  // GET /api/conversations/:id/stream - Server-sent events for real-time updates
  app.get('/api/conversations/:id/stream', async (req, res) => {
    try {
      const conversationId = requireConversationId(req);
      const userId = await ensureConversationUserExists(resolveConversationUserId(req));
      await ensureOwnedConversation(conversationId, userId);

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

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
      if (error instanceof ConversationRouteError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({
        error: `Streaming failed: ${error.message}`
      });
    }
  });

  console.log('✅ Conversation routes registered successfully');
}
