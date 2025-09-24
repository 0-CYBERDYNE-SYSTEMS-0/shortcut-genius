import { useState } from 'react';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import { Toolbar } from '@/components/Toolbar';
import { AnalysisPane } from '@/components/AnalysisPane';
import { ShortcutsGallery } from '@/components/ShortcutsGallery';
import { ReasoningControls } from '@/components/ReasoningControls';
import { useToast } from '@/hooks/use-toast';
import { AIModel, ReasoningOptions } from '@/lib/types';
import { DEFAULT_REASONING_OPTIONS } from '@/lib/models';
import { processWithAI } from '@/lib/ai';
import { Shortcut, parseShortcutFile, exportShortcut } from '@/lib/shortcuts';
import { analyzeShortcut } from '@/lib/shortcut-analyzer';

const DEFAULT_SHORTCUT: Shortcut = {
  name: 'New Shortcut',
  actions: []
};

export function Editor() {
  const [model, setModel] = useState<AIModel>('gpt-4o');
  const [reasoningOptions, setReasoningOptions] = useState<ReasoningOptions>(DEFAULT_REASONING_OPTIONS);
  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [code, setCode] = useState(JSON.stringify(DEFAULT_SHORTCUT, null, 2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const { toast } = useToast();

  const handleImport = (content: string) => {
    try {
      const imported = parseShortcutFile(content);
      setShortcut(imported);
      setCode(JSON.stringify(imported, null, 2));
      // Automatically show analysis when importing
      setShowAnalysis(true);
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
        'anonymous',
        'analyze',
        reasoningOptions
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: 'AI Processing Complete',
        description: response.content
      });
      
      // Show analysis pane after AI processing
      setShowAnalysis(true);
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

  const handleGenerate = async (prompt: string) => {
    setIsProcessing(true);
    try {
      const response = await processWithAI(
        model,
        prompt,
        'anonymous',
        'generate',
        reasoningOptions
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      const generatedShortcut = JSON.parse(response.content);
      setShortcut(generatedShortcut);
      setCode(JSON.stringify(generatedShortcut, null, 2));

      // Show analysis for generated shortcut
      setShowAnalysis(true);

      toast({
        title: 'Shortcut Generated',
        description: 'New shortcut has been created based on your description.'
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate shortcut',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFromGallery = (shortcutUrl: string) => {
    // For now, just switch to editor tab
    // In a full implementation, you'd fetch the shortcut from the URL
    setActiveTab('editor');
    toast({
      title: 'Import from Gallery',
      description: 'This feature will be fully implemented to import shortcuts from shared URLs.'
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        model={model}
        onModelChange={setModel}
        reasoningOptions={reasoningOptions}
        onReasoningOptionsChange={setReasoningOptions}
        onImport={handleImport}
        onExport={handleExport}
        onProcess={handleProcess}
        onGenerate={handleGenerate}
        isProcessing={isProcessing}
        showAnalysis={showAnalysis}
        onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
        currentShortcut={shortcut}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 h-12 mx-4 mt-4">
          <TabsTrigger value="editor" className="text-sm">Editor</TabsTrigger>
          <TabsTrigger value="gallery" className="text-sm">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 mt-0">
          <div className="flex flex-col h-full">
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1"
            >
              <ResizablePanel defaultSize={showAnalysis ? 33 : 50}>
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <EditorPane
                      value={code}
                      onChange={(value) => {
                        setCode(value);
                        try {
                          const parsed = JSON.parse(value);
                          setShortcut(parsed);
                        } catch {} // Ignore parse errors while typing
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <ReasoningControls
                      model={model}
                      options={reasoningOptions}
                      onChange={setReasoningOptions}
                    />
                  </div>
                </div>
              </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={showAnalysis ? 33 : 50}>
              <PreviewPane shortcut={shortcut} />
            </ResizablePanel>
            {showAnalysis && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={33}>
                  <AnalysisPane analysis={analyzeShortcut(shortcut)} />
                </ResizablePanel>
              </>
            )}
            </ResizablePanelGroup>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="flex-1 mt-4 px-4 pb-4 overflow-auto">
          <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
