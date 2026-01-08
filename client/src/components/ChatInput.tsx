import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  defaultModel?: string;
  onMessageSend?: (content: string) => Promise<any>;
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  className = "",
  placeholder = "Type your message here...",
  disabled = false,
  isLoading = false,
  autoFocus = false,
  maxLength = 1000,
  defaultModel = "gpt-4o",
  onMessageSend,
  onStreamingStart,
  onStreamingEnd
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!currentMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);
    onStreamingStart?.();

    try {
      const response = await onMessageSend(currentMessage);
      setCurrentMessage('');
    } catch (error: any) {
      setError(error.message || 'Send failed');
    } finally {
      setIsSending(false);
      onStreamingEnd?.();
    }
  }, [currentMessage, isSending, onMessageSend, onStreamingStart, onStreamingEnd]);

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentMessage(event.target.value);
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (currentMessage.trim()) {
        handleSend();
      }
    } else if (e.key === 'Escape') {
      setCurrentMessage('');
      setError(null);
    }
  }, [currentMessage, handleSend]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto
      textareaRef.current.style.height = 'auto';
      // Get computed height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(100, scrollHeight)}px`;
    }
  }, [currentMessage]);

  // Focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const canSend = currentMessage.trim().length > 0 && !isSending && !isLoading;
  const isDisabled = disabled || isSending || isLoading;

  return (
    <div className={cn("border rounded-lg p-4 space-y-3", className)}>
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            maxLength={maxLength}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-2 focus-visible:ring-primary"
            rows={3}
          />
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {currentMessage.length}/{maxLength}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </div>
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className="min-w-[80px]"
        >
          {isSending || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;