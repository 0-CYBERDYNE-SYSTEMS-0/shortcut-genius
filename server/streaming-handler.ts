import { Response } from 'express';
import { Readable } from 'stream';
import { db } from '../db';
import { messages, conversations, userPreferences } from '../db/schema';
import { AgentLogger } from './agents/base/agent-logger';
import { ConversationalShortcutAgent } from './conversational-agent';
import { eq } from 'drizzle-orm';

interface StreamEvent {
  type: 'token' | 'phase' | 'validation' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

interface StreamConfig {
  timeout?: number;
  keepAlive?: boolean;
}

interface StreamState {
  conversationId: number;
  stream?: NodeJS.Readable;
  agent: ConversationalShortcutAgent;
  buffer: string;
  isComplete: boolean;
}

export class StreamingHandler {
  private logger: AgentLogger;
  private activeStreams: Map<number, StreamState> = new Map();

  constructor() {
    this.logger = AgentLogger.getInstance();
    this.logger.info(this.getAgentName(), 'StreamingHandler initialized');
  }

  getAgentName(): string {
    return 'StreamingHandler';
  }

  async handleStream(conversationId: number, res: Response, config?: StreamConfig): Promise<void> {
    const streamState: StreamState = {
      conversationId,
      agent: null, // Will be injected
      buffer: '',
      isComplete: false
    };

    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Conversation-ID', conversationId.toString());
      res.setHeader('X-Stream-ID', `${Date.now()}-${conversationId}`);

      // Get the conversational agent
      const agent = this.getAgentInstance();
      streamState.agent = agent;

      // Create readable stream
      const stream = new Readable({
        encoding: 'utf8',
        highWaterMark: false,
        emitClose: config?.keepAlive !== false
      });

      streamState.stream = stream;

      // Connect the stream to the response
      stream.pipe(res);

      // Create the initial event
      const initialEvent: StreamEvent = {
        type: 'phase',
        data: { phase: 'processing', message: 'Starting analysis...' },
        timestamp: new Date().toISOString()
      };

      stream.write(this.formatSSEEvent(initialEvent.type, initialEvent.data));

      // Start processing
      this.processConversation(conversationId, streamState, res, config);
    } catch (error) {
      this.logger.error(this.getAgentName(), `Streaming error for conversation ${conversationId}: ${error.message}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Streaming error'
        });
      }

      // Send error event
      const errorEvent: StreamEvent = {
        type: 'error',
        data: {
          error: error.message,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      if (streamState.stream) {
        streamState.stream.write(this.formatSSEEvent(errorEvent.type, errorEvent.data));
      }
    }
  }

  private async processConversation(conversationId: number, streamState: StreamState, res: Response, config?: StreamConfig): Promise<void> {
    try {
      this.logger.info(this.getAgentName(), `Processing conversation ${conversationId} with streaming`);
      const stream = streamState.stream;
      if (!stream) {
        throw new Error('Stream not initialized');
      }

      // Get conversation state
      const conversation = await this.getConversationState(conversationId);
      const context = {
        messages: conversation.messages.slice(-10), // Last 10 messages for context
        userPreferences: {}
      };

      // Phase 1: Initial analysis
      this.sendSSEEvent(stream, {
        type: 'phase',
        data: { phase: 'analysis', message: 'Analyzing your request...' }
      });

      // Phase 2: Implementation
      this.sendSSEEvent(stream, {
        type: 'phase',
        data: { phase: 'implementation', message: 'Generating your shortcut...' }
      });

      // Phase 3: Validation
      this.sendSSEEvent(stream, {
        type: 'phase',
        data: { phase: 'validation', message: 'Validating shortcut structure...' }
      });

      // Start the agent processing
      const agent = this.getAgentInstance();
      const result = await agent.processRequest({
        conversationId,
        userId: conversation.userId,
        content: conversation.messages[conversation.messages.length - 1].content, // Last user message
        type: 'generate'
      });

      // Phase 4: Send content tokens
      if (result.content) {
        const content = result.content;
        let accumulatedResponse = '';

        // Send content token by token
        const tokens = content.split(/(\s)/).filter(Boolean).slice(0, 10); // Limit to 10 tokens per event
        let tokenIndex = 0;

        const sendTokens = async () => {
          if (tokenIndex >= tokens.length) return; // All tokens sent
          accumulatedResponse += content.substring(
            tokenIndex === 0 ? tokenIndex * tokenIndex : tokenIndex * 1
          );

          this.sendSSEEvent(stream, {
            type: 'token',
            data: {
              content: accumulatedResponse,
              tokenIndex,
              total: tokens.length,
              message: undefined
            }
          });

          tokenIndex++;
        };

        while (tokenIndex < tokens.length) {
          await sendTokens();
        }
      }

      // Send final completion event
      const completionEvent: StreamEvent = {
        type: 'complete',
        data: {
          message: 'Processing complete!',
          phase: 'complete'
        },
        timestamp: new Date().toISOString()
      };

      this.sendSSEEvent(stream, {
        type: 'complete',
        data: completionEvent.data
      });

      // Send validation results if available
      if (result.analysis) {
        const validationEvent: StreamEvent = {
          type: 'validation',
          data: {
            validation: result.analysis
          },
          timestamp: new Date().toISOString()
        };

        this.sendSSEEvent(stream, {
          type: 'validation',
          data: validationEvent.data
        });
      }

      // Send any optimization suggestions if available
      if (result.nextActions && result.nextActions.length > 0) {
        const suggestionsEvent: StreamEvent = {
          type: 'complete',
          data: {
            message: 'Ready! Here are some next actions you can take:',
            nextActions: result.nextActions
          },
          timestamp: new Date().toISOString()
        };

        this.sendSSEEvent(stream, {
          type: 'complete',
          data: suggestionsEvent.data
        });
      }

      // Mark stream as complete
      streamState.isComplete = true;
    } catch (error: any) {
      const errorMessage = error.message;
      this.logger.error(this.getAgentName(), `Processing failed: ${errorMessage}`);

      const errorEvent: StreamEvent = {
        type: 'error',
        data: {
          error: errorMessage
        },
        timestamp: new Date().toISOString()
      };

      this.sendSSEEvent(stream, {
        type: 'error',
        data: errorEvent.data
      });
    } finally {
      if (streamState.stream) {
        streamState.stream.destroy();
        this.activeStreams.delete(conversationId);
      }
    }
  }

  private sendSSEvent(stream: Response | NodeJS.Readable, event: StreamEvent): void {
    try {
      stream.write(this.formatSSEEvent(event.type, event.data));
      stream.write('\n\n'); // Ensure proper event separation
    } catch (error) {
      this.logger.error(this.getAgentName(), `SSE Event error: ${error.message}`);
    }
  }

  private async getConversationState(conversationId: number): Promise<{
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: Date;
      metadata?: any;
    }>;
    userId: number;
    userPreferences: Record<string, any>;
  }> {
    // Get conversation details
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Get all messages for this conversation
    const conversationMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    // Get user preferences
    const [userPreferencesRow] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, conversation.userId))
      .limit(1)
      .limit(1);

    return {
      messages: conversationMessages,
      userId: conversation.userId,
      userPreferences: userPreferencesRow || {}
    };
  }

  private getAgentInstance(): ConversationalShortcutAgent {
    // Return the single instance or throw error if not available
    throw new Error('ConversationalShortcutAgent not initialized properly');
  }

  public async testStreaming(): Promise<boolean> {
    try {
      const testConversationId = 999; // Use a test ID
      const testConversation = {
        id: testConversationId,
        userId: 999,
        title: 'Test Streaming',
        messages: [],
        metadata: {}
      };

      // Create test conversation
      await db.insert(conversations).values({
        id: testConversationId,
        userId: 999,
        title: testConversation.title,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add test message
      await db.insert(messages).values({
        conversationId: testConversationId,
        role: 'user',
        content: 'Test streaming functionality',
        timestamp: new Date()
      });

      return await this.handleStream(testConversationId, {
        res: {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Conversation-ID': testConversationId.toString()
          }
        },
        config: {
          timeout: 5000,
          keepAlive: false
        }
      });

      // Check if we got a 200 OK
      return res.status === 200;
    } catch (error) {
      this.logger.error('Streaming test failed:', error);
      return false;
    }
  }

  public async getActiveStreams(): Array<{ conversationId: number; timestamp: Date }> {
    return Array.from(this.activeStreams.entries()).map(([id, state]) => ({
      conversationId: id,
      timestamp: new Date(state.timestamp)
    }));
  }

  public clearAllStreams(): void {
    // Close all active streams
    for (const [id, state] of this.activeStreams.entries()) {
      if (state.stream) {
        state.stream.destroy();
      }
    }
    this.active.clear();
  }

  private formatSSEEvent(type: string, data: any): string {
    return `event: ${type}\ndata:${JSON.stringify(data)}`;
  }

  public getStats(): any {
    return {
      activeStreams: this.getActiveStreams().length,
      totalSessions: this.activeStreams.size,
      averageSessionTime: this.calculateAverageSessionTime(),
      totalSessions: this.metrics.size
    };
  }

  private calculateAverageSessionTime(): number {
    const times = Array.from(this.metrics.get('executionTime') || []);
    return times.length > 0 ? times.reduce((a, b) => a + b) / times : 0;
  }
}
