import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { FileUpload } from './FileUpload';
import { ShareDialog } from './ShareDialog';
import { AIModel, ReasoningOptions } from '@/lib/types';
import { Shortcut } from '@/lib/shortcuts';
import { BarChart2, Share2, Download, Mic, MoreVertical } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  reasoningOptions: ReasoningOptions;
  onReasoningOptionsChange: (options: ReasoningOptions) => void;
  onImport: (content: string) => void;
  onExport: () => void;
  onProcess: () => void;
  onGenerate: (prompt: string) => void;
  isProcessing: boolean;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
  currentShortcut?: Shortcut | null;
}

export function Toolbar({
  model,
  onModelChange,
  reasoningOptions,
  onReasoningOptionsChange,
  onImport,
  onExport,
  onProcess,
  onGenerate,
  isProcessing,
  showAnalysis,
  onToggleAnalysis,
  currentShortcut
}: ToolbarProps) {
  const [prompt, setPrompt] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { isMobile, isTablet, isDesktop, isLargeDesktop, isTouch } = useBreakpoint();

  const handleDownloadShortcut = async () => {
    if (!currentShortcut) return;

    try {
      const response = await fetch('/api/shortcuts/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut: currentShortcut })
      });

      if (!response.ok) {
        throw new Error('Failed to build shortcut');
      }

      // Create download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentShortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}.shortcut`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Could add toast notification here
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setPrompt('');
      setInputExpanded(false);
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col border-b bg-background">
          {/* Row 1: Essential actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ModelSelector value={model} onChange={onModelChange} />
              <Button
                size="sm"
                onClick={onProcess}
                disabled={isProcessing}
                className="whitespace-nowrap"
              >
                {isProcessing ? '...' : 'Process'}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onToggleAnalysis}
                className="px-2"
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="px-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShareDialogOpen(true)} disabled={!currentShortcut}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadShortcut} disabled={!currentShortcut}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport}>
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    Import
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: Expandable input */}
          <div className="px-3 py-2">
            <div className={`transition-all duration-200 ${inputExpanded ? 'min-h-[80px]' : 'h-10'}`}>
              <div className="relative">
                <Input
                  placeholder="Describe your shortcut..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setInputExpanded(true)}
                  onBlur={() => setInputExpanded(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                      handleGenerate();
                    }
                  }}
                  className="pr-20 text-base min-h-10"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  {isTouch && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleVoiceInput}
                      disabled={isListening}
                      className="h-8 w-8 p-0"
                    >
                      <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isProcessing || !prompt.trim()}
                    className="h-8 px-3"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          shortcut={currentShortcut}
        />
      </>
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <>
        <div className="h-16 border-b px-4 flex items-center gap-3">
          <ModelSelector value={model} onChange={onModelChange} />

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Input
              placeholder="Describe your shortcut..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                  handleGenerate();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !prompt.trim()}
              size="sm"
            >
              Generate
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <FileUpload onUpload={onImport} />
            <Button size="sm" variant="outline" onClick={onExport}>Export</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleAnalysis}
            >
              <BarChart2 className="mr-1 h-4 w-4" />
              {showAnalysis ? 'Hide' : 'Show'}
            </Button>
            <Button
              onClick={onProcess}
              disabled={isProcessing}
              size="sm"
            >
              {isProcessing ? 'Processing...' : 'Process'}
            </Button>
          </div>
        </div>

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          shortcut={currentShortcut}
        />
      </>
    );
  }

  // Desktop Layout with responsive breakpoints
  return (
    <>
      <div className={`border-b flex items-center ${isLargeDesktop ? 'px-6 gap-4' : 'px-4 gap-3'} ${isDesktop && !isLargeDesktop ? 'h-16' : 'h-14'}`}>
        <ModelSelector value={model} onChange={onModelChange} />

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Input
            placeholder={isLargeDesktop ? "Describe your shortcut in natural language..." : "Describe your shortcut..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                handleGenerate();
              }
            }}
            className="flex-1 min-w-[200px]"
          />
          <Button
            onClick={handleGenerate}
            disabled={isProcessing || !prompt.trim()}
            size={isLargeDesktop ? 'default' : 'sm'}
          >
            Generate
          </Button>
        </div>

        {/* Primary Actions - Always Visible */}
        <div className="flex items-center gap-2">
          <FileUpload onUpload={onImport} />

          {isLargeDesktop ? (
            <>
              <Button variant="secondary" onClick={onExport}>
                Export
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadShortcut}
                disabled={!currentShortcut}
                title="Download as .shortcut file"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShareDialogOpen(true)}
                disabled={!currentShortcut}
                title="Share shortcut with others"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExport}>
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadShortcut} disabled={!currentShortcut}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)} disabled={!currentShortcut}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="secondary"
            onClick={onToggleAnalysis}
            size={isLargeDesktop ? 'default' : 'sm'}
          >
            <BarChart2 className={isLargeDesktop ? "mr-2 h-4 w-4" : "h-4 w-4"} />
            {isLargeDesktop && (showAnalysis ? 'Hide' : 'Show')}{isLargeDesktop && ' '}Analysis
          </Button>

          <Button
            onClick={onProcess}
            disabled={isProcessing}
            size={isLargeDesktop ? 'default' : 'sm'}
          >
            {isProcessing ? 'Processing...' : isLargeDesktop ? 'Process with AI' : 'Process'}
          </Button>
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shortcut={currentShortcut}
      />
    </>
  );
}
