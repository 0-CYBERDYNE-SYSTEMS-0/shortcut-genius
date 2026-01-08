/**
 * Types for chat functionality
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    phase?: string;
    model?: string;
    usage?: any;
    shortcut?: any;
    analysis?: any;
    nextActions?: string[];
    requiresClarification?: boolean;
    error?: string;
  };
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: Date;
  //   updatedAt: Date;
  lastAccess?: Date;
  messageCount: number;
  metadata: any;
}

export interface UserPreferences {
  preferredModel?: string;
  preferredComplexity?: 'simple' | 'medium' | 'complex' | 'auto';
  metadata?: any;
}

export interface ChatState {
  conversationId?: number;
  messages: ChatMessage[];
  currentMessage: string;
  isStreaming: boolean;
  streamingPhase?: string;
  streamingProgress?: {
    phase: string;
    message: string;
  };
  userPreferences: UserPreferences;
}

export interface StreamEvent {
  type: 'token' | 'phase' | 'validation' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

export interface ChatRequest {
  content: string;
  model?: string;
  type?: 'generate' | 'analyze' | 'refine';
  reasoningOptions?: {
    reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
    verbosity?: 'silent' | 'brief' | 'verbose' | 'comprehensive';
  };
}

export interface ChatResponse {
  id: string;
  content: string;
  phase: {
    type: string;
    message: string;
  };
  shortcut?: any;
  analysis?: any;
  nextActions?: string[];
  requiresClarification?: boolean;
  error?: string;
}

export interface ChatError {
  code: string;
  message: string;
  stack?: string;
  recovery?: boolean;
  context?: any;
}

// WebSocket connection state
export interface WSConnection {
  readyState: WebSocket.ReadyState;
  lastError?: string;
  reconnectAttempts: number;
  lastPing: number;
}

// Type for WebSocket message
export interface WSMessage {
  type: 'token' | 'phase' | 'validation' | 'complete' | 'error';
  data: any;
}

export interface ChatAPIClient {
  // Conversation management
  createConversation: (title: string) => Promise<number>;
  getConversation: (id: number) => Promise<Conversation>;
  getConversations: (userId?: number, options?: { limit?: number; offset?: number }) => Promise<Conversation[]>;
  deleteConversation: (id: number) => Promise<{ success: boolean }>;
  forkConversation: (id: number, options?: { fromMessageId?: number; newTitle?: string }) => Promise<number>>;
  clearConversation: (id: number) => Promise<{ success: boolean }>;

  // Message management
  sendMessage: (conversationId: number, message: string, options?: {
    model?: string;
    reasoningOptions?: {
      reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
      verbosity?: 'silent' | 'brief' | 'verbose' | 'comprehensive';
    };
  }) => Promise<ChatResponse>;

  // Streaming
  connectStream: (conversationId: number) => Promise<{
    stream: EventSource | WebSocket;
    connection: WSConnection;
    disconnect: () => void;
    onEvent: (eventType: string, handler: (event: any) => void;
  }>;

  // Utility methods
  isValidMessage: (message: any) => message.role && ['user', 'assistant', 'system'].includes(message.role) && message.content.trim().length > 0;

  handleError: (error: ChatError) => void;

  getActiveConversations: () => number;

  getStreamingStats: () => {
    const activeConnections = this.getActiveConversations();
    return activeConnections;
  };
}