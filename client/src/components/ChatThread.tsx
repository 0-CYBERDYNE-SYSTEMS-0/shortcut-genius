import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Trash2,
  RefreshCw,
  Plus,
  History,
  Loader2,
  Brain,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChatMessage as IChatMessage, Conversation } from '../lib/chat-types';
import { chatAPI } from '../lib/chat-api';
import { Shortcut } from '../lib/shortcuts';
import { processWithAI } from '@/lib/ai';
import { AIModel } from '@/lib/types';

interface ChatThreadProps {
  className?: string;
  currentShortcut?: Shortcut;
  onShortcutUpdate?: (shortcut: Shortcut) => void;
  onMessageSend?: (content: string) => Promise<any>;
  userId?: number;
  autoFocus?: boolean;
  model?: string;
  sessionKey?: string; // Unique key to preserve session across remounts
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  className = "",
  currentShortcut,
  onShortcutUpdate,
  userId = 1,
  autoFocus = true,
  model = 'gpt-4o',
  sessionKey
}) => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>();
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [agentUpdates, setAgentUpdates] = useState<string[]>([]);
  const [agentProgress, setAgentProgress] = useState<Array<{
    type: 'info' | 'progress' | 'warning' | 'error' | 'success';
    message: string;
    phase?: string;
    progress?: number;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Save conversation ID to sessionStorage when it changes
  const setActiveConversationIdWithSave = useCallback((id: number | undefined) => {
    setActiveConversationId(id);
    if (sessionKey && id) {
      sessionStorage.setItem(`chat-session-${sessionKey}`, String(id));
    }
  }, [sessionKey]);

  const normalizeMessage = (message: IChatMessage): IChatMessage => {
    if (message.timestamp instanceof Date) {
      return message;
    }
    return {
      ...message,
      timestamp: new Date(message.timestamp as any)
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize chat system
  useEffect(() => {
    initializeChat();
  }, [userId, sessionKey]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conversationList = await chatAPI.getConversations(userId);
      setConversations(conversationList);

      // Check if we have a saved conversation ID for this session
      const savedConversationId = sessionKey 
        ? parseInt(sessionStorage.getItem(`chat-session-${sessionKey}`) || '0')
        : 0;

      // Try to load saved conversation
      let loadedConversation = false;
      if (savedConversationId > 0) {
        const exists = conversationList.find(c => c.id === savedConversationId);
        if (exists) {
          await loadConversation(savedConversationId);
          setActiveConversationIdWithSave(savedConversationId);
          loadedConversation = true;
        }
      }

      // If no saved conversation or it doesn't exist, load most recent
      if (!loadedConversation && conversationList.length > 0 && !activeConversationId) {
        const mostRecent = conversationList[0];
        await loadConversation(mostRecent.id);
        setActiveConversationIdWithSave(mostRecent.id);
      }

      // Only set initialized after ALL async operations complete
      setIsInitialized(true);
    } catch (error: any) {
      console.error('Failed to initialize chat:', error);
      setError(error.message || 'Failed to load conversation history');

      // Try to create a new conversation as fallback
      try {
        const newConversationId = await chatAPI.createConversation('New Chat', userId);

        // Batch state updates
        setActiveConversationIdWithSave(newConversationId);
        setMessages([]);
        
        setIsInitialized(true);
      } catch (createError: any) {
        console.error('Failed to create fallback conversation:', createError);
        setError('Unable to initialize chat. Please refresh the page.');
        // Don't set isInitialized on double failure
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (conversationId: number) => {
    try {
      const conversation = await chatAPI.getConversation(conversationId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages.map(normalizeMessage));
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation');
    }
  };

  const createNewConversation = useCallback(async (): Promise<number | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const conversationId = await chatAPI.createConversation('New Chat', userId);
      setActiveConversationIdWithSave(conversationId);
      setMessages([]);

      // Refresh conversation list
      const conversationList = await chatAPI.getConversations(userId);
      setConversations(conversationList);

      return conversationId;
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      setError(error.message || 'Failed to create new conversation');
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionKey]);

  const clearConversation = async () => {
    if (!activeConversationId) return;

    setIsLoading(true);
    try {
      await chatAPI.clearConversation(activeConversationId);
      setMessages([]);
      setError(null);
    } catch (error: any) {
      console.error('Failed to clear conversation:', error);
      setError(error.message || 'Failed to clear conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    setIsLoading(true);
    try {
      await chatAPI.deleteConversation(conversationId);

      if (conversationId === activeConversationId) {
        setActiveConversationIdWithSave(undefined);
        setMessages([]);
      }

      // Refresh conversation list
      const conversationList = await chatAPI.getConversations(userId);
      setConversations(conversationList);

      // Auto-select a different conversation if available
      if (conversationList.length > 0 && !activeConversationId) {
        const mostRecent = conversationList[0];
        setActiveConversationIdWithSave(mostRecent.id);
        await loadConversation(mostRecent.id);
      }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      setError(error.message || 'Failed to delete conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const runFallback = async () => {
      setStreamingPhase('Using fallback AI...');
      const fallbackPrompt = currentShortcut
        ? `Current shortcut:\n${JSON.stringify(currentShortcut, null, 2)}\n\nUser request: ${content.trim()}`
        : content.trim();
      const fallbackResult = await processWithAI(
        model as AIModel,
        fallbackPrompt,
        'anonymous',
        'generate',
        {
          reasoning_effort: 'medium',
          verbosity: 'verbose'
        }
      );

      if (fallbackResult.error) {
        throw new Error(fallbackResult.error);
      }

      let parsedShortcut: Shortcut | undefined;
      try {
        const parsed = JSON.parse(fallbackResult.content);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.actions)) {
          parsedShortcut = parsed as Shortcut;
        }
      } catch {}

      return {
        content: fallbackResult.content,
        shortcut: parsedShortcut
      };
    };

    // Create conversation if none exists
    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        conversationId = await createNewConversation();
        if (!conversationId) {
          throw new Error('Failed to create conversation');
        }
      } catch (error) {
        console.warn('Conversation creation failed, falling back to direct AI call.');
      }
    }

    // Add user message
    const userMessage: IChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      metadata: {
        shortcut: currentShortcut ? JSON.parse(JSON.stringify(currentShortcut)) : undefined
      }
    };

    setMessages(prev => [...prev, normalizeMessage(userMessage)]);
    setIsStreaming(true);
    setStreamingPhase('Processing your request...');
    setAgentUpdates(['Request queued']);
    setAgentProgress([]);
    setError(null);

    try {
      let response: any;
      if (conversationId) {
        // Send message to API with streamed progress updates.
        response = await chatAPI.sendMessageStream(
          conversationId,
          content,
          {
          model,
          reasoningOptions: {
            reasoning_effort: 'medium',
            verbosity: 'verbose'
          }
        },
          (event) => {
            if (!isMountedRef.current) return;

            if (event.type === 'phase') {
              const message = event.data?.message || event.data?.phase || 'Working...';
              setStreamingPhase(message);
              setAgentUpdates(prev => {
                if (prev[prev.length - 1] === message) {
                  return prev;
                }
                return [...prev, message].slice(-8);
              });
            }

            // Handle structured agent updates
            if (event.type === 'update' && event.data) {
              const update = event.data as {
                type: 'info' | 'progress' | 'warning' | 'error' | 'success';
                message: string;
                phase?: string;
                progress?: number;
              };

              setStreamingPhase(update.message);
              setAgentUpdates(prev => [...prev, update.message].slice(-8));
              
              setAgentProgress(prev => {
                // Add new update or update existing
                const existingIndex = prev.findIndex(u => 
                  u.message === update.message && u.phase === update.phase
                );
                
                if (existingIndex >= 0) {
                  // Update existing
                  const updated = [...prev];
                  updated[existingIndex] = update;
                  return updated.slice(-5); // Keep last 5 updates
                } else {
                  // Add new
                  return [...prev, update].slice(-5);
                }
              });
            }
          }
        );
      } else {
        response = await runFallback();
      }

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Add assistant response
      const assistantMessage: IChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.content || response.message || '',
        timestamp: new Date(),
        metadata: {
          phase: response.phase?.type,
          model: response.model,
          shortcut: response.shortcut,
          analysis: response.analysis,
          nextActions: response.nextActions,
          requiresClarification: response.requiresClarification
        }
      };

      setMessages(prev => [...prev, normalizeMessage(assistantMessage)]);

      // If response contains a shortcut, update editor
      if (response.shortcut && onShortcutUpdate) {
        onShortcutUpdate(response.shortcut);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);

      try {
        const fallbackResponse = await runFallback();

        if (!isMountedRef.current) return;

        const assistantMessage: IChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: new Date(),
          metadata: {
            model,
            shortcut: fallbackResponse.shortcut
          }
        };

        setMessages(prev => [...prev, normalizeMessage(assistantMessage)]);

        if (fallbackResponse.shortcut && onShortcutUpdate) {
          onShortcutUpdate(fallbackResponse.shortcut);
        }

        setError(null);
        return;
      } catch (fallbackError: any) {
        console.error('Fallback AI failed:', fallbackError);
      }

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Add error message
      const errorMessage: IChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
        metadata: {
          error: error.message
        }
      };

      setMessages(prev => [...prev, normalizeMessage(errorMessage)]);
      setError(error.message || 'Failed to send message');
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsStreaming(false);
        setStreamingPhase('');
        setAgentUpdates([]);
      }
    }
  }, [activeConversationId, createNewConversation, currentShortcut, model, onShortcutUpdate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleApplyShortcut = (message: IChatMessage) => {
    if (message.metadata?.shortcut && onShortcutUpdate) {
      onShortcutUpdate(message.metadata.shortcut);
    }
  };

  const getActiveConversation = () => {
    return conversations.find(c => c.id === activeConversationId);
  };

  if (!isInitialized) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold uppercase tracking-wide">AI Agent Console</h3>
        </div>
      </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center">
          {error ? (
            <div className="text-center space-y-4 max-w-xs">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Initialization failed</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={initializeChat}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Initializing AI Assistant</h3>
                <p className="text-muted-foreground text-sm">
                  Setting up your conversation space...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold uppercase tracking-wide">AI Agent Console</h3>
          {isStreaming && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {streamingPhase || 'Thinking...'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConversationHistory(!showConversationHistory)}
            disabled={isLoading}
          >
            <History className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={createNewConversation}
            disabled={isLoading || isStreaming}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {activeConversationId && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              disabled={isLoading || isStreaming}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conversation History Sidebar */}
      {showConversationHistory && (
        <div className="border-b bg-muted/30">
          <div className="p-3">
            <h4 className="text-sm font-medium mb-2">Conversation History</h4>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "p-2 rounded cursor-pointer text-sm hover:bg-muted/50 transition-colors",
                        activeConversationId === conv.id && "bg-muted"
                      )}
                      onClick={() => {
                        setActiveConversationIdWithSave(conv.id);
                        loadConversation(conv.id);
                        setShowConversationHistory(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{conv.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conv.messageCount || 0} messages
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Current Shortcut Context */}
      {currentShortcut && (
        <div className="border-b bg-blue-50/30 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              Context: {currentShortcut.name}
            </Badge>
            <span className="text-muted-foreground">
              {currentShortcut.actions.length} actions
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Ask me to help you create, analyze, or optimize your iOS shortcuts.
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>"Create a shortcut to set a timer"</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>"Analyze my current shortcut for improvements"</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>"Add a notification to this shortcut"</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1}
                isLast={index === messages.length - 1}
                onApplyToEditor={handleApplyShortcut}
                className={cn(
                  "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                )}
              />
            ))
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <Sparkles className="h-3 w-3 animate-pulse text-primary" />
              </div>
              <span className="text-sm">{streamingPhase || 'AI is thinking...'}</span>
            </div>
          )}

          {agentUpdates.length > 0 && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent Activity</div>
              {agentUpdates.map((update, index) => (
                <div key={`${update}-${index}`} className="text-xs text-foreground/90">
                  {index + 1}. {update}
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="border-t p-3 bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {(isLoading || isStreaming) && (
        <div className="border-t p-3 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {streamingPhase || 'Processing with AI...'}
              </span>
            </div>
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/3 bg-primary/70 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          onMessageSend={handleSendMessage}
          onStreamingStart={() => setIsStreaming(true)}
          onStreamingEnd={() => setIsStreaming(false)}
          isLoading={isLoading || isStreaming}
          autoFocus={autoFocus}
          placeholder={
            currentShortcut
              ? "Ask me about this shortcut or suggest improvements..."
              : "How can I help you with iOS shortcuts today?"
          }
        />
      </div>
    </div>
  );
};

export default ChatThread;
