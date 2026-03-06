import type { Express } from 'express';
import type { ConversationalShortcutAgent } from '../conversational-agent';

type MemoryMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
};

type MemoryConversation = {
  id: number;
  title: string;
  messageCount: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
};

export function registerSimpleConversationRoutes(app: Express, agent?: ConversationalShortcutAgent) {
  console.log('🗨️ Registering simplified conversation routes...');

  // In-memory fallback store when DB is unavailable
  const mockConversations: MemoryConversation[] = [];
  const mockMessages = new Map<number, MemoryMessage[]>();
  const defaultUserId = 1;
  const writeStreamEvent = (res: any, type: string, data: any) => {
    res.write(`${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n`);
  };

  // POST /api/conversations/create - Create new conversation
  app.post('/api/conversations/create', async (req, res) => {
    const { userId = defaultUserId, title, initialPrompt, model = 'gpt-4o' } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Missing required field: title'
      });
    }

    try {
      // Create mock conversation
      const newConversationId = Date.now();
      const newConversation: MemoryConversation = {
        id: newConversationId,
        title,
        userId,
        messageCount: initialPrompt ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { model, createdAt: new Date().toISOString() }
      };

      mockConversations.push(newConversation);
      if (initialPrompt) {
        mockMessages.set(newConversationId, [
          {
            id: `msg_${newConversationId}_${Date.now()}`,
            role: 'user',
            content: initialPrompt,
            timestamp: new Date(),
            metadata: { model }
          }
        ]);
      }

      res.status(201).json({
        success: true,
        id: newConversationId,
        message: 'Conversation created successfully (mock)',
        conversation: newConversation
      });

    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        error: 'Failed to create conversation',
        details: error.message
      });
    }
  });

  // GET /api/conversations/:id - Get conversation details (mock)
  app.get('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      // Find mock conversation
      const conversation = mockConversations.find(c => c.id === conversationId);

      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      const storedMessages = mockMessages.get(conversationId) || [];

      res.json({
        success: true,
        conversation,
        messages: storedMessages
      });

    } catch (error: any) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to get conversation',
        details: error.message
      });
    }
  });

  // GET /api/conversations - List conversations (mock)
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || defaultUserId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      // Filter by userId and return mock data
      const userConversations = mockConversations.filter(c => c.userId === userId);
      const paginatedConversations = userConversations.slice(offset, offset + limit);

      res.json(paginatedConversations);

    } catch (error: any) {
      console.error('List conversations error:', error);
      res.status(500).json({
        error: 'Failed to list conversations',
        details: error.message
      });
    }
  });

  // DELETE /api/conversations/:id - Delete conversation (mock)
  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const index = mockConversations.findIndex(c => c.id === conversationId);

      if (index === -1) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      mockConversations.splice(index, 1);
      mockMessages.delete(conversationId);

      res.json({
        success: true,
        message: 'Conversation deleted successfully (mock)'
      });

    } catch (error: any) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        error: 'Failed to delete conversation',
        details: error.message
      });
    }
  });

  // POST /api/conversations/:id/messages - Send message (mock)
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, model = 'gpt-4o', reasoningOptions = {} } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      const userMessageId = `msg_${conversationId}_${Date.now()}`;
      const userMessage: MemoryMessage = {
        id: userMessageId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        metadata: { model, reasoningOptions }
      };

      const messagesForConversation = mockMessages.get(conversationId) || [];
      messagesForConversation.push(userMessage);
      mockMessages.set(conversationId, messagesForConversation);

      const conversation = mockConversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.messageCount += 1;
        conversation.updatedAt = new Date();
      }

      let aiResponse: any;

      if (agent) {
        const keyStatus = agent.checkApiKeyAvailability(model as any);
        if (!keyStatus.available) {
          return res.status(400).json({
            error: keyStatus.error || 'Model API key not configured'
          });
        }

        aiResponse = await agent.processRequest({
          conversationId: undefined,
          userId: defaultUserId,
          content: content.trim(),
          model: model as any,
          type: 'generate',
          reasoningOptions,
          context: { messages: messagesForConversation },
          persistMessages: false
        });
      } else {
        aiResponse = {
          content: `I received your message: "${content.trim()}". This is a mock response since the AI processing is not yet connected.`,
          model: model,
          phase: {
            type: 'mock',
            message: 'Mock response for testing'
          },
          nextActions: ['Try asking me to create a shortcut', 'Describe your shortcut in detail']
        };
      }

      const assistantMessageId = `msg_${conversationId}_${Date.now() + 1}`;
      const assistantMessage: MemoryMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: {
          model: model,
          phase: aiResponse.phase?.type || aiResponse.phase,
          nextActions: aiResponse.nextActions,
          shortcut: aiResponse.shortcut,
          analysis: aiResponse.analysis
        }
      };

      messagesForConversation.push(assistantMessage);
      mockMessages.set(conversationId, messagesForConversation);
      if (conversation) {
        conversation.messageCount += 1;
        conversation.updatedAt = new Date();
      }

      res.json({
        success: true,
        userMessage: userMessage,
        assistantMessage: assistantMessage,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        content: aiResponse.content,
        phase: aiResponse.phase,
        model: model,
        shortcut: aiResponse.shortcut,
        analysis: aiResponse.analysis,
        requiresClarification: aiResponse.requiresClarification,
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

  // POST /api/conversations/:id/messages/stream - stream message processing phases and final response
  app.post('/api/conversations/:id/messages/stream', async (req, res) => {
    const conversationId = parseInt(req.params.id);
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
      const userMessageId = `msg_${conversationId}_${Date.now()}`;
      const userMessage: MemoryMessage = {
        id: userMessageId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        metadata: { model, reasoningOptions }
      };

      const messagesForConversation = mockMessages.get(conversationId) || [];
      messagesForConversation.push(userMessage);
      mockMessages.set(conversationId, messagesForConversation);

      const conversation = mockConversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.messageCount += 1;
        conversation.updatedAt = new Date();
      }

      writeStreamEvent(res, 'phase', {
        phase: 'analysis',
        message: 'Understanding your shortcut request...'
      });

      let aiResponse: any;

      if (agent) {
        const keyStatus = agent.checkApiKeyAvailability(model as any);
        if (!keyStatus.available) {
          writeStreamEvent(res, 'error', {
            error: keyStatus.error || 'Model API key not configured'
          });
          return res.end();
        }

        writeStreamEvent(res, 'phase', {
          phase: 'research',
          message: 'Researching actions and constraints...'
        });

        writeStreamEvent(res, 'phase', {
          phase: 'implementation',
          message: 'Building your shortcut...'
        });

        aiResponse = await agent.processRequest({
          conversationId: undefined,
          userId: defaultUserId,
          content: content.trim(),
          model: model as any,
          type: 'generate',
          reasoningOptions,
          context: { messages: messagesForConversation },
          persistMessages: false
        });
      } else {
        aiResponse = {
          content: `I received your message: "${content.trim()}". This is a mock response since the AI processing is not yet connected.`,
          model: model,
          phase: {
            type: 'mock',
            message: 'Mock response for testing'
          },
          nextActions: ['Try asking me to create a shortcut', 'Describe your shortcut in detail']
        };
      }

      writeStreamEvent(res, 'phase', {
        phase: 'validation',
        message: 'Validating output and preparing response...'
      });

      const assistantMessageId = `msg_${conversationId}_${Date.now() + 1}`;
      const assistantMessage: MemoryMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: {
          model: model,
          phase: aiResponse.phase?.type || aiResponse.phase,
          nextActions: aiResponse.nextActions,
          shortcut: aiResponse.shortcut,
          analysis: aiResponse.analysis
        }
      };

      messagesForConversation.push(assistantMessage);
      mockMessages.set(conversationId, messagesForConversation);
      if (conversation) {
        conversation.messageCount += 1;
        conversation.updatedAt = new Date();
      }

      writeStreamEvent(res, 'result', {
        success: true,
        userMessage: userMessage,
        assistantMessage: assistantMessage,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        content: aiResponse.content,
        phase: aiResponse.phase,
        model: model,
        shortcut: aiResponse.shortcut,
        analysis: aiResponse.analysis,
        requiresClarification: aiResponse.requiresClarification,
        nextActions: aiResponse.nextActions,
        timestamp: assistantMessage.timestamp
      });

      return res.end();
    } catch (error: any) {
      writeStreamEvent(res, 'error', {
        error: error.message || 'Failed to process message'
      });
      return res.end();
    }
  });

  console.log('✅ Simplified conversation routes registered successfully');
}
