import { ChatMessage, ChatRequest, ChatResponse, ChatError } from './chat-types';

/**
 * Chat API client for conversation management
 */
export class ChatAPIClient {
  private baseURL: string;
  private static readonly DEFAULT_TIMEOUT_MS = 15000;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || '';
  }

  private async requestJson<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs: number = ChatAPIClient.DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        const message =
          errorData?.message ||
          errorData?.error ||
          `HTTP error: ${response.status}`;
        throw new Error(message);
      }

      return response.json() as Promise<T>;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title: string, userId?: number): Promise<number> {
    const result = await this.requestJson<{ id: number }>(
      `${this.baseURL}/api/conversations/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          initialPrompt: title,
          userId: userId || 1
        })
      }
    );
    return result.id;
  }

  /**
   * Get conversation details
   */
  async getConversation(id: number): Promise<any> {
    return this.requestJson(`${this.baseURL}/api/conversations/${id}`);
  }

  /**
   * List user conversations
   */
  async getConversations(userId?: number, options?: { limit?: number; offset?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    return this.requestJson(`${this.baseURL}/api/conversations?${params}`);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: number): Promise<{ success: boolean }> {
    return this.requestJson(`${this.baseURL}/api/conversations/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Clear all messages in a conversation
   */
  async clearConversation(id: number): Promise<{ success: boolean }> {
    return this.requestJson(`${this.baseURL}/api/conversations/${id}/clear`, {
      method: 'POST'
    });
  }

  /**
   * Fork a conversation
   */
  async forkConversation(id: number, options?: { fromMessageId?: number; newTitle?: string }): Promise<number> {
    const result = await this.requestJson<{ id: number }>(
      `${this.baseURL}/api/conversations/${id}/fork`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options || {})
      }
    );
    return result.id;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    conversationId: number,
    message: string,
    options?: {
      model?: string;
      reasoningOptions?: {
        reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
        verbosity?: 'silent' | 'brief' | 'verbose' | 'comprehensive';
      };
    }
  ): Promise<ChatResponse> {
    return this.requestJson(`${this.baseURL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        model: options?.model || 'gpt-4o',
        reasoningOptions: options?.reasoningOptions || {}
      })
    });
  }

  /**
   * Connect to a conversation stream
   */
  async connectStream(conversationId: number): Promise<{
    stream: EventSource;
    connection: {
      readyState: number;
      lastError?: string;
      reconnectAttempts: number;
      lastPing: number;
    };
    disconnect: () => void;
  }> {
    try {
      const stream = new EventSource(`${this.baseURL}/api/conversations/${conversationId}/stream`);
      const connection = {
        readyState: EventSource.OPEN,
        lastError: undefined,
        reconnectAttempts: 0,
        lastPing: Date.now(),
        stream
      };

      const disconnect = () => {
        stream.close();
      };

      return { stream, connection, disconnect };
    } catch (error: any) {
      console.error('Failed to connect to conversation stream:', error);
      throw new Error(`Failed to create streaming connection: ${error.message}`);
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(
    query: string,
    options?: { userId?: number; limit?: number; offset?: number }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (options?.userId) params.append('userId', options.userId.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    return this.requestJson(`${this.baseURL}/api/conversations/search?${params}`);
  }

  /**
   * Get shortcut versions for a conversation
   */
  async getShortcutVersions(conversationId: number): Promise<any> {
    return this.requestJson(`${this.baseURL}/api/conversations/${conversationId}/versions`);
  }

  /**
   * Validate if a message is properly formatted
   */
  isValidMessage(message: any): message is ChatMessage {
    return (
      message &&
      typeof message === 'object' &&
      message.role &&
      ['user', 'assistant', 'system'].includes(message.role) &&
      message.content &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0
    );
  }

  /**
   * Handle API errors consistently
   */
  handleError(error: ChatError): void {
    console.error('Chat API Error:', error);

    // You could implement more sophisticated error handling here
    // Such as showing user-friendly messages, retrying, etc.
  }

  /**
   * Get number of active conversations
   */
  getActiveConversations(): number {
    // This would typically be tracked in state
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): {
    activeConnections: number;
    messagesStreamed: number;
    averageLatency: number;
  } {
    // This would typically be tracked in state
    // For now, return placeholder values
    return {
      activeConnections: this.getActiveConversations(),
      messagesStreamed: 0,
      averageLatency: 0
    };
  }
}

// Create a singleton instance for easy use
export const chatAPI = new ChatAPIClient();
