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
import { getNextConversationSelectionAfterDelete } from '../lib/conversation-state';
import { extractShortcutFromText, Shortcut, validateShortcut } from '../lib/shortcuts';
import { processWithAI } from '@/lib/ai';
import { AIModel } from '@/lib/types';

interface ChatThreadProps {
  className?: string;
  currentShortcut?: Shortcut;
  onShortcutUpdate?: (shortcut: Shortcut) => void;
  onOpenInspector?: (panel: 'insights' | 'test' | 'model') => void;
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
  onOpenInspector,
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

  const normalizeShortcutCandidate = useCallback((candidate: unknown, fallbackContent?: string): Shortcut | undefined => {
    if (candidate && typeof candidate === 'object' && Array.isArray((candidate as Shortcut).actions)) {
      const shortcut = candidate as Shortcut;
      return validateShortcut(shortcut).length === 0 ? shortcut : undefined;
    }

    if (!fallbackContent) {
      return undefined;
    }

    try {
      return extractShortcutFromText(fallbackContent).shortcut;
    } catch {
      return undefined;
    }
  }, []);

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
      const wasActiveConversation = conversationId === activeConversationId;
      await chatAPI.deleteConversation(conversationId);

      if (wasActiveConversation) {
        setActiveConversationIdWithSave(undefined);
        setMessages([]);
      }

      // Refresh conversation list
      const conversationList = await chatAPI.getConversations(userId);
      setConversations(conversationList);

      const nextConversationId = getNextConversationSelectionAfterDelete(
        conversationList,
        conversationId,
        activeConversationId
      );

      if (wasActiveConversation && nextConversationId) {
        setActiveConversationIdWithSave(nextConversationId);
        await loadConversation(nextConversationId);
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

      const parsedShortcut = normalizeShortcutCandidate(undefined, fallbackResult.content);

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
      const normalizedShortcut = normalizeShortcutCandidate(response.shortcut, response.content || response.message || '');

      const assistantMessage: IChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.content || response.message || '',
        timestamp: new Date(),
        metadata: {
          phase: response.phase?.type,
          model: response.model,
          shortcut: normalizedShortcut,
          analysis: response.analysis,
          nextActions: response.nextActions,
          requiresClarification: response.requiresClarification
        }
      };

      setMessages(prev => [...prev, normalizeMessage(assistantMessage)]);

      // If response contains a shortcut, update editor
      if (normalizedShortcut && onShortcutUpdate) {
        onShortcutUpdate(normalizedShortcut);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);

      try {
        const fallbackResponse = await runFallback();

        if (!isMountedRef.current) return;

        const normalizedShortcut = normalizeShortcutCandidate(fallbackResponse.shortcut, fallbackResponse.content);

        const assistantMessage: IChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: new Date(),
          metadata: {
            model,
            shortcut: normalizedShortcut
          }
        };

        setMessages(prev => [...prev, normalizeMessage(assistantMessage)]);

        if (normalizedShortcut && onShortcutUpdate) {
          onShortcutUpdate(normalizedShortcut);
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
  }, [activeConversationId, createNewConversation, currentShortcut, model, normalizeShortcutCandidate, onShortcutUpdate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleApplyShortcut = (message: IChatMessage) => {
    const normalizedShortcut = normalizeShortcutCandidate(message.metadata?.shortcut, message.content);
    if (normalizedShortcut && onShortcutUpdate) {
      onShortcutUpdate(normalizedShortcut);
    }
  };

  const handleDownloadShortcut = async (shortcutToDownload: Shortcut) => {
    try {
      const response = await fetch('/api/shortcuts/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut: shortcutToDownload,
          sign: true,
          signMode: 'anyone'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to build shortcut');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shortcutToDownload.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.shortcut`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.message || 'Failed to download shortcut');
    }
  };

  const sendStarterPrompt = (content: string) => {
    void handleSendMessage(content);
  };

  const getActiveConversation = () => {
    return conversations.find(c => c.id === activeConversationId);
  };

  if (!isInitialized) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-accent-pink font-semibold uppercase tracking-wide">Builder Assistant</h3>
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
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-accent-pink font-semibold uppercase tracking-wide">Builder Assistant</h3>
            <p className="text-xs text-muted-foreground">Describe the shortcut, then apply or inspect the result.</p>
          </div>
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

      {currentShortcut && (
        <div className="border-b bg-blue-50/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              Context: {currentShortcut.name}
            </Badge>
            <span className="text-muted-foreground">
              {currentShortcut.actions.length} actions
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onOpenInspector?.('insights')}
            >
              Inspect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => sendStarterPrompt('Explain what this shortcut is doing and suggest the best next improvement.')}
            >
              Improve
            </Button>
          </div>
        </div>
      )}

      {(isLoading || isStreaming) && (
        <div className="border-b bg-muted/30 p-3">
          <div className="rounded-lg border border-border/70 bg-background/80 p-3">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {streamingPhase || 'Processing with AI...'}
              </span>
            </div>
            {agentUpdates.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {agentUpdates.map((update, index) => (
                  <div key={`${update}-${index}`}>{index + 1}. {update}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="text-accent-aqua mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">Start with intent, not JSON</h3>
              <p className="mb-5 max-w-sm text-muted-foreground">
                Describe the shortcut you want, then refine or inspect the generated result without leaving the builder.
              </p>
              <div className="grid w-full gap-2 text-left">
                <Button
                  variant="outline"
                  className="h-auto justify-start px-3 py-3 text-left"
                  onClick={() => sendStarterPrompt('Create a shortcut that captures a note, tags it, and saves it to Notes.')}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Create from prompt
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start px-3 py-3 text-left"
                  onClick={() => sendStarterPrompt('Analyze my current shortcut for the highest-impact improvement.')}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Improve current shortcut
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start px-3 py-3 text-left"
                  onClick={() => sendStarterPrompt('Explain this shortcut in plain English and call out any risky steps.')}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Explain the flow
                </Button>
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
                onDownloadShortcut={handleDownloadShortcut}
                onOpenInspector={onOpenInspector}
                className={cn(
                  "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                )}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

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

      <div className="border-t p-4">
        <ChatInput
          onMessageSend={handleSendMessage}
          onStreamingStart={() => setIsStreaming(true)}
          onStreamingEnd={() => setIsStreaming(false)}
          isLoading={isLoading || isStreaming}
          autoFocus={autoFocus}
          placeholder={
            currentShortcut
              ? "Ask for a change, improvement, or explanation..."
              : "Describe the shortcut you want to build..."
          }
        />
      </div>
    </div>
  );
};

export default ChatThread;
