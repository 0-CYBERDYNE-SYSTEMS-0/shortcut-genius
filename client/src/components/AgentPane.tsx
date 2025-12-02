import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, Globe, FileText, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

// Types for agent activity tracking
export interface AgentActivity {
  id: string;
  timestamp: Date;
  type: 'search' | 'extract' | 'crawl' | 'generate' | 'analyze' | 'error';
  status: 'running' | 'completed' | 'failed';
  query?: string;
  results?: any;
  toolUsed?: string;
  details?: string;
  sources?: SearchResult[];
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
  isProcessing?: boolean;
  onClearHistory?: () => void;
  onRetrySearch?: (query: string) => void;
}

export function AgentPane({ 
  activities, 
  isProcessing = false, 
  onClearHistory,
  onRetrySearch 
}: AgentPaneProps) {
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
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

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">AI Agent Activity</CardTitle>
        <div className="flex items-center space-x-2">
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {onClearHistory && activities.length > 0 && (
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
      
      <ScrollArea className="h-[calc(100%-5rem)]">
        <CardContent className="space-y-3 pt-0">
          {sortedActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No agent activity yet</p>
              <p className="text-xs mt-1">Generate or analyze a shortcut to see AI web search activity</p>
            </div>
          ) : (
            sortedActivities.map((activity) => (
              <div key={activity.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActivityIcon(activity)}
                    <span className="font-medium text-sm capitalize">
                      {activity.type}
                      {activity.toolUsed && (
                        <span className="text-muted-foreground ml-1">
                          ({activity.toolUsed})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(activity.status)}
                    {getStatusBadge(activity.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>

                {activity.query && (
                  <div className="text-sm">
                    <span className="font-medium">Query:</span> {activity.query}
                  </div>
                )}

                {activity.details && (
                  <Collapsible 
                    open={expandedActivities.has(activity.id)}
                    onOpenChange={() => toggleExpanded(activity.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 p-0 text-xs">
                        {expandedActivities.has(activity.id) ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        {activity.status === 'running' ? 'Details' : 'Results'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {activity.status === 'running' ? (
                        <div className="text-sm text-muted-foreground italic">
                          {activity.details || 'Processing...'}
                        </div>
                      ) : (
                        <>
                          {activity.sources && activity.sources.length > 0 && (
                            <div className="space-y-2">
                              <div className="font-medium text-sm">Sources Found:</div>
                              {activity.sources.map((source, idx) => (
                                <div key={idx} className="border-l-2 border-blue-200 pl-2 py-1">
                                  <div className="flex items-center justify-between">
                                    <a 
                                      href={source.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-blue-600 hover:underline flex items-center"
                                    >
                                      {source.title}
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                    {source.used && (
                                      <Badge variant="secondary" className="text-xs">Used</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {source.snippet}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Source: {source.source}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {activity.results && typeof activity.results === 'string' && (
                            <div className="text-sm bg-muted p-2 rounded">
                              <div className="font-medium mb-1">Result:</div>
                              <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                                {activity.results}
                              </pre>
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
                    className="text-xs"
                  >
                    Retry Search
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

// Hook for managing agent activity state
export function useAgentActivity() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);

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
    addActivity,
    updateActivity,
    clearActivities,
    addSearchActivity,
    addExtractActivity,
    addGenerateActivity,
    completeActivity,
    failActivity
  };
}
