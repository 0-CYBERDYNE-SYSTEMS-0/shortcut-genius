import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, Globe, FileText, Loader2, CheckCircle, XCircle, ExternalLink, Send, Bot, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Types for agent activity tracking
export interface AgentActivity {
  id: string;
  timestamp: Date;
  type: 'search' | 'extract' | 'crawl' | 'generate' | 'analyze' | 'error' | 'message';
  status: 'running' | 'completed' | 'failed';
  query?: string;
  results?: any;
  toolUsed?: string;
  details?: string;
  sources?: SearchResult[];
  message?: string;
  isUser?: boolean;
}

export interface ChatMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  activities?: AgentActivity[];
  shortcutUpdate?: any;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  used?: boolean;
}

export interface AgentPaneProps {
  activities: AgentActivity[];
  messages: ChatMessage[];
  isProcessing?: boolean;
  onClearHistory?: () => void;
  onRetrySearch?: (query: string) => void;
  onSendMessage?: (message: string) => void;
  onUpdateShortcut?: (shortcut: any) => void;
}

export function AgentPane({ 
  activities, 
  messages,
  isProcessing = false, 
  onClearHistory,
  onRetrySearch,
  onSendMessage,
  onUpdateShortcut
}: AgentPaneProps) {
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [inputMessage, setInputMessage] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
  };

  const toggleMessageExpanded = (id: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMessages(newExpanded);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && onSendMessage) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActivityIcon = (activity: AgentActivity) => {
    switch (activity.type) {
      case 'search':
        return <Search className="h-4 w-4" />;
      case 'extract':
        return <FileText className="h-4 w-4" />;
      case 'crawl':
        return <Globe className="h-4 w-4" />;
      case 'generate':
        return <CheckCircle className="h-4 w-4" />;
      case 'analyze':
        return <FileText className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary" className="text-xs">Running</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else {
      return timestamp.toLocaleTimeString();
    }
  };

  const sortedActivities = [...activities].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          AI Agent
        </CardTitle>
        <div className="flex items-center space-x-2">
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {onClearHistory && messages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearHistory}
              className="text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1">
        <CardContent className="pt-0">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-medium mb-1">AI Agent Ready</h3>
              <p className="text-xs mb-3">
                I can search the web, find API documentation, and help you build iOS shortcuts with real integrations.
              </p>
              <div className="text-xs text-muted-foreground">
                <p>Try asking me to:</p>
                <ul className="mt-1 space-y-1">
                  <li>• "Create a weather shortcut with OpenWeatherMap API"</li>
                  <li>• "Find ananobanana API for image generation"</li>
                  <li>• "Build a shortcut that posts to Twitter"</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {sortedMessages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-center space-x-2 mb-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-muted-foreground flex items-center">
                        {message.type === 'user' ? (
                          <>
                            <User className="h-3 w-3 mr-1" />
                            You
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 mr-1" />
                            AI Agent
                          </>
                        )}
                        <span>• {formatTimestamp(message.timestamp)}</span>
                      </span>
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Show activities for this message */}
                      {message.activities && message.activities.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.activities.map((activity) => (
                            <div key={activity.id} className="border rounded p-2 bg-background">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1">
                                  {getActivityIcon(activity)}
                                  <span className="text-xs font-medium capitalize">
                                    {activity.type}
                                    {activity.toolUsed && (
                                      <span className="text-muted-foreground ml-1">
                                        ({activity.toolUsed})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(activity.status)}
                                  {getStatusBadge(activity.status)}
                                </div>
                              </div>

                              {activity.query && (
                                <div className="text-xs text-muted-foreground mb-1">
                                  {activity.query}
                                </div>
                              )}

                              {(activity.sources || activity.results) && (
                                <Collapsible 
                                  open={expandedActivities.has(activity.id)}
                                  onOpenChange={() => toggleExpanded(activity.id)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 p-0 text-xs">
                                      {expandedActivities.has(activity.id) ? (
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 mr-1" />
                                      )}
                                      {activity.status === 'running' ? 'Working...' : `Results (${activity.sources?.length || 0} sources)`}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-1 mt-1">
                                    {activity.status === 'running' ? (
                                      <div className="text-xs text-muted-foreground italic">
                                        {activity.details || 'Processing...'}
                                      </div>
                                    ) : (
                                      <>
                                        {activity.sources && activity.sources.length > 0 && (
                                          <div className="space-y-1">
                                            {activity.sources.map((source, idx) => (
                                              <div key={idx} className="text-xs border-l-2 border-blue-200 pl-2">
                                                <a 
                                                  href={source.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="font-medium text-blue-600 hover:underline flex items-center"
                                                >
                                                  {source.title}
                                                  <ExternalLink className="h-2 w-2 ml-1" />
                                                </a>
                                                {source.snippet && (
                                                  <div className="text-muted-foreground mt-1">
                                                    {source.snippet.length > 100 
                                                      ? `${source.snippet.substring(0, 100)}...`
                                                      : source.snippet
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {activity.results && typeof activity.results === 'string' && (
                                          <div className="text-xs bg-muted p-1 rounded max-h-20 overflow-auto">
                                            <pre className="whitespace-pre-wrap">{activity.results}</pre>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}

                              {activity.status === 'failed' && activity.query && onRetrySearch && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => onRetrySearch(activity.query!)}
                                  className="text-xs mt-1"
                                >
                                  Retry
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show shortcut update if available */}
                      {message.shortcutUpdate && onUpdateShortcut && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="text-xs font-medium text-green-800 mb-1">
                            Shortcut Updated
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onUpdateShortcut(message.shortcutUpdate)}
                            className="text-xs"
                          >
                            Apply Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to find APIs or build shortcuts..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            size="sm"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          I can search for APIs, extract documentation, and build shortcuts with real integrations.
        </div>
      </div>
    </Card>
  );
}

// Hook for managing agent activity state
export function useAgentActivity() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addActivity = (activity: Omit<AgentActivity, 'id' | 'timestamp'>) => {
    const newActivity: AgentActivity = {
      ...activity,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setActivities(prev => [...prev, newActivity]);
    return newActivity.id;
  };

  const updateActivity = (id: string, updates: Partial<AgentActivity>) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === id ? { ...activity, ...updates } : activity
      )
    );
  };

  const clearActivities = () => {
    setActivities([]);
    setMessages([]);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const addUserMessage = (content: string) => {
    return addMessage({
      type: 'user',
      content,
      isUser: true
    });
  };

  const addAssistantMessage = (content: string, activities?: AgentActivity[], shortcutUpdate?: any) => {
    return addMessage({
      type: 'assistant',
      content,
      activities,
      shortcutUpdate
    });
  };

  const addSystemMessage = (content: string) => {
    return addMessage({
      type: 'system',
      content
    });
  };

  const addSearchActivity = (query: string, tool: string = 'web_search') => {
    return addActivity({
      type: 'search',
      status: 'running',
      query,
      toolUsed: tool,
      details: `Searching web for: ${query}...`
    });
  };

  const addExtractActivity = (urls: string[]) => {
    return addActivity({
      type: 'extract',
      status: 'running',
      details: `Extracting content from ${urls.length} URLs...`
    });
  };

  const addGenerateActivity = () => {
    return addActivity({
      type: 'generate',
      status: 'running',
      details: 'Generating iOS shortcut based on research...'
    });
  };

  const completeActivity = (id: string, results?: any, sources?: SearchResult[]) => {
    updateActivity(id, {
      status: 'completed',
      results,
      sources
    });
  };

  const failActivity = (id: string, error: string) => {
    updateActivity(id, {
      status: 'failed',
      details: error
    });
  };

  return {
    activities,
    messages,
    addActivity,
    updateActivity,
    clearActivities,
    addMessage,
    addUserMessage,
    addAssistantMessage,
    addSystemMessage,
    addSearchActivity,
    addExtractActivity,
    addGenerateActivity,
    completeActivity,
    failActivity
  };
}
