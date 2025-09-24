import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { FileUpload } from './FileUpload';
import { ShareDialog } from './ShareDialog';
import { AIModel, ReasoningOptions } from '@/lib/types';
import { Shortcut } from '@/lib/shortcuts';
import { BarChart2, Share2, Download } from 'lucide-react';

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

  return (
    <>
      <div className="h-14 border-b px-4 flex items-center gap-4">
        <ModelSelector value={model} onChange={onModelChange} />

        <div className="flex-1 flex items-center gap-2">
          <Input
            placeholder="Describe your shortcut in natural language..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                onGenerate(prompt);
                setPrompt('');
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={() => {
              onGenerate(prompt);
              setPrompt('');
            }}
            disabled={isProcessing || !prompt}
          >
            Generate
          </Button>
        </div>

        <FileUpload onUpload={onImport} />

        <Button
          variant="secondary"
          onClick={onExport}
        >
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

        <Button
          variant="secondary"
          onClick={onToggleAnalysis}
        >
          <BarChart2 className="mr-2 h-4 w-4" />
          {showAnalysis ? 'Hide' : 'Show'} Analysis
        </Button>

        <Button
          onClick={onProcess}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Process with AI'}
        </Button>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shortcut={currentShortcut}
      />
    </>
  );
}
