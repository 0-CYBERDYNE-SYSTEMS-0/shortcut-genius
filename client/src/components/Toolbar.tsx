import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelSelector } from './ModelSelector';
import { FileUpload } from './FileUpload';
import { AIModel } from '@/lib/types';
import { BarChart2 } from 'lucide-react';

interface ToolbarProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  onImport: (content: string) => void;
  onExport: () => void;
  onProcess: () => void;
  onGenerate: (prompt: string) => void;
  isProcessing: boolean;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
}

export function Toolbar({
  model,
  onModelChange,
  onImport,
  onExport,
  onProcess,
  onGenerate,
  isProcessing,
  showAnalysis,
  onToggleAnalysis
}: ToolbarProps) {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="h-14 border-b px-4 flex items-center gap-4">
      <ModelSelector value={model} onChange={onModelChange} />
      
      <div className="flex-1 flex items-center gap-2">
        <Input
          placeholder="Describe your shortcut in natural language..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
  );
}
