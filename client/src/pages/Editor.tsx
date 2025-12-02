import { useState } from 'react';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import { Toolbar } from '@/components/Toolbar';
import { AnalysisPane } from '@/components/AnalysisPane';
import { AgentPane, useAgentActivity } from '@/components/AgentPane';
import { ShortcutsGallery } from '@/components/ShortcutsGallery';
import { ReasoningControls } from '@/components/ReasoningControls';
import { useToast } from '@/hooks/use-toast';
import { useBreakpoint } from '@/hooks/use-mobile';
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
  const [showAgent, setShowAgent] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [mobileActiveTab, setMobileActiveTab] = useState('editor');
  const { toast } = useToast();
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useBreakpoint();
  
  // Agent activity state management
  const agentActivity = useAgentActivity();

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
        reasoningOptions,
        agentActivity.addActivity
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: 'AI Processing Complete',
        description: response.generatedWithWebSearch ? 
          'Analysis complete with web search insights' : 
          'Analysis complete'
      });
      
      // Show analysis pane and agent pane after AI processing
      setShowAnalysis(true);
      if (response.generatedWithWebSearch) {
        setShowAgent(true);
      }
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
        reasoningOptions,
        agentActivity.addActivity
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      const generatedShortcut = JSON.parse(response.content);
      setShortcut(generatedShortcut);
      setCode(JSON.stringify(generatedShortcut, null, 2));

      // Show analysis and agent pane for generated shortcut
      setShowAnalysis(true);
      if (response.generatedWithWebSearch) {
        setShowAgent(true);
      }

      toast({
        title: 'Shortcut Generated',
        description: response.generatedWithWebSearch ? 
          'Shortcut created with real API integrations discovered via web search' :
          'New shortcut has been created based on your description.'
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

  // Mobile Layout: Tab-based interface
  if (isMobile) {
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
          showAgent={showAgent}
          onToggleAgent={() => setShowAgent(!showAgent)}
          currentShortcut={shortcut}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-12 mx-3 mt-3">
            <TabsTrigger value="editor" className="text-sm">Editor</TabsTrigger>
            <TabsTrigger value="gallery" className="text-sm">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-0">
            <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="flex-1 flex flex-col">
              <TabsList className={`grid w-full h-12 mx-3 mt-3 ${
                showAnalysis && showAgent ? 'grid-cols-4' : 
                showAnalysis || showAgent ? 'grid-cols-3' : 'grid-cols-2'
              }`}>
                <TabsTrigger value="editor" className="text-sm">Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-sm">Preview</TabsTrigger>
                {showAnalysis && <TabsTrigger value="analysis" className="text-sm">Analysis</TabsTrigger>}
                {showAgent && <TabsTrigger value="agent" className="text-sm">AI Agent</TabsTrigger>}
              </TabsList>

              <TabsContent value="editor" className="flex-1 mt-0">
                <div className="flex flex-col h-full px-3 pt-3">
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
                  <div className="py-3">
                    <ReasoningControls
                      model={model}
                      options={reasoningOptions}
                      onChange={setReasoningOptions}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 mt-0">
                <div className="h-full px-3 pt-3">
                  <PreviewPane shortcut={shortcut} />
                </div>
              </TabsContent>

              {showAnalysis && (
                <TabsContent value="analysis" className="flex-1 mt-0">
                  <div className="h-full px-3 pt-3">
                    <AnalysisPane analysis={analyzeShortcut(shortcut)} />
                  </div>
                </TabsContent>
              )}
              {showAgent && (
                <TabsContent value="agent" className="flex-1 mt-0">
                  <div className="h-full px-3 pt-3">
                    <AgentPane 
                      activities={agentActivity.activities}
                      isProcessing={isProcessing}
                      onClearHistory={agentActivity.clearActivities}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>

          <TabsContent value="gallery" className="flex-1 mt-3 px-3 pb-3 overflow-auto">
            <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Tablet Layout: Two-column with optional third
  if (isTablet) {
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
          showAgent={showAgent}
          onToggleAgent={() => setShowAgent(!showAgent)}
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
                <ResizablePanel defaultSize={50}>
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
                    <div className="p-3">
                      <ReasoningControls
                        model={model}
                        options={reasoningOptions}
                        onChange={setReasoningOptions}
                      />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50}>
                  <Tabs defaultValue="preview" className="h-full flex flex-col">
                    <TabsList className={`grid w-full h-12 m-3 ${
                        showAnalysis && showAgent ? 'grid-cols-3' : 
                        showAnalysis || showAgent ? 'grid-cols-2' : 'grid-cols-1'
                      }`}>
                      <TabsTrigger value="preview" className="text-sm">Preview</TabsTrigger>
                      {showAnalysis && <TabsTrigger value="analysis" className="text-sm">Analysis</TabsTrigger>}
                      {showAgent && <TabsTrigger value="agent" className="text-sm">AI Agent</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="preview" className="flex-1 mt-0 px-3">
                      <PreviewPane shortcut={shortcut} />
                    </TabsContent>
                    {showAnalysis && (
                      <TabsContent value="analysis" className="flex-1 mt-0 px-3">
                        <AnalysisPane analysis={analyzeShortcut(shortcut)} />
                      </TabsContent>
                    )}
                    {showAgent && (
                      <TabsContent value="agent" className="flex-1 mt-0 px-3">
                        <AgentPane 
                          activities={agentActivity.activities}
                          isProcessing={isProcessing}
                          onClearHistory={agentActivity.clearActivities}
                        />
                      </TabsContent>
                    )}
                  </Tabs>
                </ResizablePanel>
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

  // Desktop Layout: Responsive resizable panels
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
        <TabsList className={`grid w-full grid-cols-2 ${isLargeDesktop ? 'h-12 mx-6 mt-6' : 'h-12 mx-4 mt-4'}`}>
          <TabsTrigger value="editor" className="text-sm">Editor</TabsTrigger>
          <TabsTrigger value="gallery" className="text-sm">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 mt-0">
          <div className="flex flex-col h-full">
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1"
            >
              <ResizablePanel defaultSize={showAnalysis && showAgent ? 25 : showAnalysis || showAgent ? 33 : 50}>
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
                  <div className={isLargeDesktop ? "p-6" : "p-4"}>
                    <ReasoningControls
                      model={model}
                      options={reasoningOptions}
                      onChange={setReasoningOptions}
                    />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={showAnalysis && showAgent ? 25 : showAnalysis || showAgent ? 33 : 50}>
                <PreviewPane shortcut={shortcut} />
              </ResizablePanel>
              {showAnalysis && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={showAgent ? 25 : 50}>
                    <AnalysisPane analysis={analyzeShortcut(shortcut)} />
                  </ResizablePanel>
                </>
              )}
              {showAgent && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={showAnalysis ? 25 : 50}>
                    <AgentPane 
                      activities={agentActivity.activities}
                      isProcessing={isProcessing}
                      onClearHistory={agentActivity.clearActivities}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className={`flex-1 overflow-auto ${isLargeDesktop ? 'mt-6 px-6 pb-6' : 'mt-4 px-4 pb-4'}`}>
          <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
