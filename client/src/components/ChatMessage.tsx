import React from 'react';
import { ChatMessage as IChatMessage } from '../lib/chat-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Copy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: IChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  isLast = false,
  className = ""
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyToEditor = () => {
    if (message.metadata?.shortcut) {
      // This will be handled by the parent component
      console.log('Apply shortcut to editor:', message.metadata.shortcut);
    }
  };

  return (
    <div className={cn("flex gap-3", isLast ? 'mb-6' : 'mb-2', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          {message.role === 'user' ? (
            <AvatarFallback className="bg-blue-500 text-white">
              U
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-purple-500 text-white">
              A
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          {isStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-pulse">Thinking...</div>
            </div>
          ) : (
            <p className="whitespace-pre-line">{message.content}</p>
          )}
        </div>

        {/* Message Metadata */}
        {message.metadata && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {message.metadata.model && (
              <Badge variant="outline" className="text-xs">
                {message.metadata.model}
              </Badge>
            )}
            {message.metadata.phase && (
              <Badge variant="secondary" className="text-xs">
                {message.metadata.phase}
              </Badge>
            )}
            {message.timestamp && (
              <span>
                {(() => {
                  const timestamp =
                    message.timestamp instanceof Date
                      ? message.timestamp
                      : new Date(message.timestamp);
                  return Number.isNaN(timestamp.getTime())
                    ? ''
                    : timestamp.toLocaleTimeString();
                })()}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {message.role === 'assistant' && !isStreaming && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={copied}
              className="text-xs"
            >
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            {message.metadata?.shortcut && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyToEditor}
                className="text-xs"
              >
                <ArrowRight className="h-3 w-3" />
                Apply to Editor
              </Button>
            )}

            {message.metadata?.analysis && (
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                <ArrowRight className="h-3 w-3" />
                View Analysis
              </Button>
            )}
          </div>
        )}

        {/* Error Display */}
        {message.metadata?.error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <span>Error: {message.metadata.error}</span>
            </div>
          </div>
        )}

        {/* Next Actions */}
        {message.metadata?.nextActions && message.metadata.nextActions.length > 0 && (
          <div className="mt-3 p-3 bg-muted/30 rounded-md">
            <h4 className="text-sm font-medium mb-2">Suggested Actions:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {message.metadata.nextActions.map((action, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
