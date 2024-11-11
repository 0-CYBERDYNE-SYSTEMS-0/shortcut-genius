import { Button } from '@/components/ui/button';
import { ModelSelector } from './ModelSelector';
import { FileUpload } from './FileUpload';
import { AIModel } from '@/lib/ai';

interface ToolbarProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
  onImport: (content: string) => void;
  onExport: () => void;
  onProcess: () => void;
  isProcessing: boolean;
}

export function Toolbar({
  model,
  onModelChange,
  onImport,
  onExport,
  onProcess,
  isProcessing
}: ToolbarProps) {
  return (
    <div className="h-14 border-b px-4 flex items-center gap-4">
      <ModelSelector value={model} onChange={onModelChange} />
      
      <div className="flex-1" />
      
      <FileUpload onUpload={onImport} />
      
      <Button
        variant="secondary"
        onClick={onExport}
      >
        Export
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
