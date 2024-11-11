import { useState } from 'react';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import { Toolbar } from '@/components/Toolbar';
import { useToast } from '@/hooks/use-toast';
import { AIModel, processWithAI } from '@/lib/ai';
import { Shortcut, parseShortcutFile, exportShortcut } from '@/lib/shortcuts';

const DEFAULT_SHORTCUT: Shortcut = {
  name: 'New Shortcut',
  actions: []
};

export function Editor() {
  const [model, setModel] = useState<AIModel>('gpt-4o');
  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [code, setCode] = useState(JSON.stringify(DEFAULT_SHORTCUT, null, 2));
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleImport = (content: string) => {
    try {
      const imported = parseShortcutFile(content);
      setShortcut(imported);
      setCode(JSON.stringify(imported, null, 2));
      toast({
        title: 'Shortcut imported',
        description: 'The shortcut file was successfully imported.'
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    try {
      const blob = new Blob([exportShortcut(shortcut)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shortcut.name}.shortcut`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export file',
        variant: 'destructive'
      });
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await processWithAI(
        model,
        `Analyze this iOS shortcut and suggest improvements:\n${code}`,
        'anonymous' // Using anonymous for now until auth is implemented
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: 'AI Processing Complete',
        description: response.content
      });
    } catch (error) {
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process with AI',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        model={model}
        onModelChange={setModel}
        onImport={handleImport}
        onExport={handleExport}
        onProcess={handleProcess}
        isProcessing={isProcessing}
      />
      
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        <ResizablePanel defaultSize={50}>
          <EditorPane
            value={code}
            onChange={(value) => {
              setCode(value);
              try {
                setShortcut(JSON.parse(value));
              } catch {} // Ignore parse errors while typing
            }}
          />
        </ResizablePanel>
        <ResizablePanel defaultSize={50}>
          <PreviewPane shortcut={shortcut} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
