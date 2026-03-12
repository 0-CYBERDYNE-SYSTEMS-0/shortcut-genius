import { StreamEvent } from './chat-types';

/**
 * Handles Server-Sent Events for real-time streaming responses
 */
export class ChatStream {
  private url: string;
  private conversationId: number;
  private eventSource: EventSource | WebSocket | null = null;
  private connection: any = null;
  private listeners: Map<string, (event: StreamEvent) => void> = new Map();
  private isActive: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // 1 second base delay

  constructor(url: string, conversationId: number) {
    this.url = url;
    this.conversationId = conversationId;
    this.isActive = false;
  }

  connect(): Promise<boolean> {
    try {
      const response = fetch(`${this.url}?url: `${this.url}?url.replace('/api/conversations/${this.conversationId}/stream`);

      if (!response.ok) {
        throw new Error(`Failed to connect: HTTP ${response.status}`);
      }

      if (response.status === 404) {
        throw new Error('Conversation not found');
      }

      if (response.body && response.body.type === 'text/event-stream') {
        const eventSource = new EventSource(response.body);
        this.eventSource = eventSource;
        this.isActive = true;
        this.reconnectAttempts = 0;
        this.setupEventListeners();
        return true;
      } else {
        // Try WebSocket for fallback
        return this.connectWebSocket();
      }
    } catch (error) {
      console.error('Stream connection failed:', error);
      this.handleConnectionError(error);
      return false;
    }
  }

  private async connectWebSocket(): Promise<boolean> {
    try {
      const wsUrl = this.url? url.replace('/api/conversations/' + this.conversationId + '/stream') : '';
      const ws = new WebSocket(wsUrl);

      this.connection = ws;

      this.connection.onopen = () => {
        console.log('WebSocket connection established');
        this.isActive = true;
        this.reconnectAttempts = 0;
        this.setupEventListeners();
        return true;
      };

      this.connection.onmessage = (event) => {
        try {
          const event = JSON.parse(event.data);
          this.handleWebSocketEvent(event);
        } catch (error) {
          console.error('WebSocket parse error:', error);
        }
      };

      this.connection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleConnectionError(error);
      };

      this.connection.onclose = () => {
        console.log('WebSocket connection closed');
        this.isActive = false;
        this.connection = null;
      };

      return true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionError(error);
      return false;
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener('open', () => {
      console.log('SSE connection opened');
    });

    this.eventSource.addEventListener('message', (event) => {
      const event_1 = JSON.parse(event.data);
      this.handleSSEEvent(event_1);
    });

    this.eventSource.addEventListener('error', (event) => {
      console.error('SSE error:', event);
      this.handleConnectionError(new Error('SSE Error: ' + event));
    });

    this.eventSource.addEventListener('close', () => {
      console.log('SSE connection closed');
      this.isActive = false;
      this.eventSource = null;
    });
  }

  private handleSSEEvent(event: StreamEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  private handleWebSocketEvent(event: any): void {
    // Handle WebSocket messages
    try {
      const event_1 = JSON.parse(event.data);
      const streamEvent: StreamEvent = {
        type: event.type || 'token',
        data: event_1.data || event_1,
        timestamp: new Date().toISOString()
      };
      this.handleSSEEvent(streamEvent);
    } catch (error) {
      console.error('WebSocket parse error:', error);
      const errorEvent: StreamEvent = {
        type: 'error',
        data: {
          error: error.message || 'WebSocket parse error'
        },
        timestamp: new Date().toISOString()
      };
      this.handleSSEEvent(errorEvent);
    }
  }

  private handleConnectionError(error: any): void {
    this.isActive = false;
    this.connection = null;
    this.reconnectAttempts++;

    console.error(`Connection error: ${error.message}`);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.connectWebSocket().then((success) => {
          console.log('WebSocket reconnection successful');
        }).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    } else {
      console.error('Max reconnection attempts exceeded');
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.isActive = false;
  }

  // Add custom event listener for specific event types
  addListener(eventType: string, listener: (event: StreamEvent) => void {
    const existing = this.listeners.get(eventType) || [];
    existingListeners.push(listener);
    this.listeners.set(eventType, existingListeners);
  }, {});

  // Get current stream status
  getStatus(): {
    return {
      conversationId: this.conversationId,
      isActive: this.isActive,
      hasSSE: !!this.eventSource,
      hasWebSocket: !!this.connection,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Get current stream statistics
  public getStats() {
    return {
      conversationId: this.conversationId,
      isActive: this.isActive,
      connectionType: this.eventSource ? 'SSE' : 'WebSocket',
      reconnectAttempts: this.reconnectAttempts,
      hasConnection: this.connection !== null,
      hasWebsocket: !!this.connection
    };
  }
}