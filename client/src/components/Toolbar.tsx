import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModelSelector } from './ModelSelector';
import { FileUpload } from './FileUpload';
import { ShareDialog } from './ShareDialog';
import { ThemeToggle } from './theme-toggle';
import { AIModel, ReasoningOptions } from '@/lib/types';
import { Shortcut } from '@/lib/shortcuts';
import { BarChart2, Share2, Download, MoreVertical, Shield } from 'lucide-react';
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
  isProcessing: boolean;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
  currentShortcut?: Shortcut | null;
  onDownloadSigned?: () => void;
}

export function Toolbar({
  model,
  onModelChange,
  reasoningOptions,
  onReasoningOptionsChange,
  onImport,
  onExport,
  onProcess,
  isProcessing,
  showAnalysis,
  onToggleAnalysis,
  currentShortcut,
  onDownloadSigned
}: ToolbarProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [debugBuild, setDebugBuild] = useState(false);
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useBreakpoint();

  const handleDownloadShortcut = async (debug = false) => {
    if (!currentShortcut) return;

    try {
      const response = await fetch('/api/shortcuts/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut: currentShortcut, sign: true, signMode: 'anyone', debug: debug || debugBuild })
      });

      if (!response.ok) {
        throw new Error('Failed to build shortcut');
      }

      // Create download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = (debug || debugBuild) ? '_debug' : '_signed';
      a.download = `${currentShortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}${suffix}.shortcut`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Could add toast notification here
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
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
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
                  <DropdownMenuItem onClick={onDownloadSigned} disabled={!currentShortcut || !onDownloadSigned}>
                    <Shield className="mr-2 h-4 w-4" />
                    Download Signed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport}>
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    Import
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="flex items-center gap-2">
            <FileUpload onUpload={onImport} />
            <ThemeToggle />
            <Button size="sm" variant="outline" onClick={onExport}>Export JSON</Button>
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
              {isProcessing ? 'Analyzing...' : 'Analyze'}
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

        {/* Primary Actions - Always Visible */}
        <div className="flex items-center gap-2">
          <FileUpload onUpload={onImport} />
          <ThemeToggle />

          {isLargeDesktop ? (
            <>
              <Button variant="secondary" onClick={onExport}>
                Export JSON
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadShortcut()}
                disabled={!currentShortcut}
                title="Download as .shortcut file"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant={debugBuild ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDebugBuild(d => !d)}
                title="Toggle debug build — inserts Show Result after each action for step-by-step tracing"
              >
                {debugBuild ? 'Debug ON' : 'Debug'}
              </Button>
              <Button
                variant="secondary"
                onClick={onDownloadSigned}
                disabled={!currentShortcut || !onDownloadSigned}
                title="Download signed .shortcut file"
              >
                <Shield className="mr-2 h-4 w-4" />
                Download Signed
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
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadShortcut} disabled={!currentShortcut}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadSigned} disabled={!currentShortcut || !onDownloadSigned}>
                  <Shield className="mr-2 h-4 w-4" />
                  Download Signed
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
            {isProcessing ? 'Analyzing...' : 'Analyze'}
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
