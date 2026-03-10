import { useMemo, useRef, useState, useEffect } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import { Toolbar } from '@/components/Toolbar';
import { AnalysisPane } from '@/components/AnalysisPane';
import { ShortcutsGallery } from '@/components/ShortcutsGallery';
import { ReasoningControls } from '@/components/ReasoningControls';
import { TestRunner } from '@/components/TestRunner';
import { ProviderSettings } from '@/components/ProviderSettings';
import { FileUpload } from '@/components/FileUpload';
import { ModelSelector } from '@/components/ModelSelector';
import { ShareDialog } from '@/components/ShareDialog';
import { ThemeToggle } from '@/components/theme-toggle';
import ChatThread from '@/components/ChatThread';
import { useToast } from '@/hooks/use-toast';
import { useBreakpoint } from '@/hooks/use-mobile';
import { AIModel, ReasoningOptions } from '@/lib/types';
import { DEFAULT_REASONING_OPTIONS, getModelConfig, supportsReasoning, supportsVerbosity } from '@/lib/models';
import { processWithAI } from '@/lib/ai';
import { Shortcut, parseShortcutFile, exportShortcut } from '@/lib/shortcuts';
import { analyzeShortcut } from '@/lib/shortcut-analyzer';
import {
  BarChart2,
  ChevronRight,
  Download,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MessageCircle,
  Settings,
  Share2
} from 'lucide-react';

const DEFAULT_SHORTCUT: Shortcut = {
  name: 'New Shortcut',
  actions: []
};

type WorkspaceTab = 'editor' | 'chat' | 'gallery';
type MobileEditorTab = 'editor' | 'preview' | 'analysis' | 'test';

type SidePanelTab = 'assistant' | 'analysis';

export function Editor() {
  const [model, setModel] = useState<AIModel>('minimax/minimax-m2.1');
  const [reasoningOptions, setReasoningOptions] = useState<ReasoningOptions>(DEFAULT_REASONING_OPTIONS);
  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [code, setCode] = useState(JSON.stringify(DEFAULT_SHORTCUT, null, 2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileEditorTab>('editor');
  const [chatSessionKey] = useState(() => `editor-session-${Date.now()}`);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('assistant');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const assistantPanelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    if (!assistantPanelRef.current) return;
    if (activeTab !== 'editor') {
      assistantPanelRef.current.collapse();
      return;
    }
    if (isSidePanelOpen) {
      assistantPanelRef.current.expand();
    } else {
      assistantPanelRef.current.collapse();
    }
  }, [activeTab, isSidePanelOpen]);

  const actionCount = shortcut.actions.length;
  const hasShortcut = shortcut.actions.length > 0;

  const analysis = useMemo(() => analyzeShortcut(shortcut), [shortcut]);

  const handleImport = (content: string) => {
    try {
      const imported = parseShortcutFile(content);
      setShortcut(imported);
      setCode(JSON.stringify(imported, null, 2));
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
      a.download = `${shortcut.name}.json`;
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

  const handleDownloadShortcut = async () => {
    if (!hasShortcut) return;

    try {
      const response = await fetch('/api/shortcuts/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut, sign: true, signMode: 'anyone' })
      });

      if (!response.ok) {
        throw new Error('Failed to build shortcut');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.shortcut`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to build signed shortcut',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadSignedShortcut = async () => {
    if (!hasShortcut) return;

    try {
      const response = await fetch('/api/shortcuts/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut, sign: true })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Signing failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.shortcut`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Signed download failed',
        description: error instanceof Error ? error.message : 'Failed to sign shortcut',
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

      setShowAnalysis(true);
      setSidePanelTab('analysis');
      setIsSidePanelOpen(true);
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

  const handleImportFromGallery = (shortcutUrl: string) => {
    setActiveTab('editor');
    toast({
      title: 'Import from Gallery',
      description: 'This feature will be fully implemented to import shortcuts from shared URLs.'
    });
  };

  const handleChatShortcutUpdate = (updatedShortcut: Shortcut) => {
    setShortcut(updatedShortcut);
    setCode(JSON.stringify(updatedShortcut, null, 2));
    setShowAnalysis(true);

    toast({
      title: 'Shortcut Updated from Chat',
      description: 'The shortcut has been updated based on the AI conversation.'
    });
  };

  if (isMobile) {
    return (
      <div className="app-shell h-screen flex flex-col">
        <Toolbar
          model={model}
          onModelChange={setModel}
          reasoningOptions={reasoningOptions}
          onReasoningOptionsChange={setReasoningOptions}
          onImport={handleImport}
          onExport={handleExport}
          onProcess={handleProcess}
          isProcessing={isProcessing}
          showAnalysis={showAnalysis}
          onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
          currentShortcut={shortcut}
          onDownloadSigned={handleDownloadSignedShortcut}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full h-11 mx-3 mt-3 grid-cols-3 gap-1">
            <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">Assistant</TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-0">
            <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="flex-1 flex flex-col">
              <TabsList className={`grid w-full h-11 mx-3 mt-3 gap-1 ${showAnalysis ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="editor" className="text-xs">Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                {showAnalysis && <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>}
                <TabsTrigger value="test" className="text-xs">Test</TabsTrigger>
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
                        } catch {}
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
                    <AnalysisPane analysis={analysis} />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="test" className="flex-1 mt-0">
                <div className="h-full px-3 pt-3">
                  <TestRunner shortcut={shortcut} />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="gallery" className="flex-1 mt-3 px-3 pb-3 overflow-auto">
            <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 mt-0" forceMount>
            <div className="h-full">
              <ChatThread
                currentShortcut={shortcut}
                onShortcutUpdate={handleChatShortcutUpdate}
                model={model}
                sessionKey={chatSessionKey}
                autoFocus={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="app-shell h-screen w-screen flex text-foreground">
      <aside className="w-64 border-r-2 border-border bg-card px-4 py-6 flex flex-col gap-6">
        <div className="app-stagger">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Shortcut Genius</div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Workbench</h1>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`nav-pill flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                activeTab === 'editor'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Workbench
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`nav-pill flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                activeTab === 'gallery'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Library
            </button>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between rounded-xl border bg-card/90 px-3 py-2">
          <div className="text-sm text-muted-foreground">Theme</div>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b-2 border-border bg-card px-6 py-4 app-enter">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI Shortcut Studio</div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">{shortcut.name}</h2>
                <Badge className="text-[10px] uppercase tracking-[0.15em]">AI-first</Badge>
                <Badge variant="secondary" className="text-xs">
                  {actionCount} actions
                </Badge>
                {isProcessing && (
                  <Badge variant="outline" className="text-xs">
                    Processing…
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModelSelector value={model} onChange={setModel} />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Model
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[380px] flex flex-col">
                  <SheetHeader className="shrink-0">
                    <SheetTitle>Model Settings</SheetTitle>
                  </SheetHeader>
                  <Tabs defaultValue="model" className="flex-1 flex flex-col min-h-0 mt-3">
                    <TabsList className="grid grid-cols-2 shrink-0">
                      <TabsTrigger value="model">Model</TabsTrigger>
                      <TabsTrigger value="providers">Providers</TabsTrigger>
                    </TabsList>

                    <TabsContent value="model" className="flex-1 overflow-y-auto mt-3 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Active Model</label>
                        <ModelSelector value={model} onChange={setModel} />
                      </div>

                      {(() => {
                        const cfg = getModelConfig(model as AIModel);
                        return (
                          <div className="rounded-md border p-3 space-y-1 text-sm">
                            <div className="font-medium">{cfg.name}</div>
                            <div className="text-muted-foreground capitalize">
                              {cfg.provider} · {cfg.category}
                            </div>
                            <div className="text-muted-foreground">
                              Context: {(cfg.capabilities.contextWindow / 1000).toFixed(0)}k tokens
                            </div>
                          </div>
                        );
                      })()}

                      {(supportsReasoning(model as AIModel) || supportsVerbosity(model as AIModel)) ? (
                        <ReasoningControls
                          model={model}
                          options={reasoningOptions}
                          onChange={setReasoningOptions}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No advanced settings available for this model.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="providers" className="flex-1 overflow-y-auto mt-3">
                      <ProviderSettings />
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>
              <FileUpload onUpload={handleImport} />
              <Button variant="secondary" size="sm" onClick={handleExport}>
                Export JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadShortcut}
                disabled={!hasShortcut}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                disabled={!hasShortcut}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {activeTab === 'editor' && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleProcess}
                disabled={isProcessing}
                size="lg"
              >
                Run Analysis
              </Button>
              <Button
                variant={sidePanelTab === 'assistant' && isSidePanelOpen ? 'default' : 'secondary'}
                onClick={() => {
                  setSidePanelTab('assistant');
                  setIsSidePanelOpen(true);
                }}
                size="lg"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                AI Agent
              </Button>
              <Button
                variant={sidePanelTab === 'analysis' && isSidePanelOpen ? 'default' : 'secondary'}
                onClick={() => {
                  setSidePanelTab('analysis');
                  setIsSidePanelOpen(true);
                  setShowAnalysis(true);
                }}
                size="lg"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Insights
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' ? (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full px-6 py-6">
                  <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
                    <ResizablePanel defaultSize={55} minSize={35}>
                      <div className="panel-surface rounded-2xl h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <div className="text-sm font-semibold">Editor</div>
                          <Badge variant="outline" className="text-xs">JSON</Badge>
                        </div>
                        <div className="flex-1 p-3">
                          <EditorPane
                            value={code}
                            onChange={(value) => {
                              setCode(value);
                              try {
                                const parsed = JSON.parse(value);
                                setShortcut(parsed);
                              } catch {}
                            }}
                            className="h-full border-transparent bg-transparent shadow-none"
                          />
                        </div>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={45} minSize={30}>
                      <div className="panel-surface rounded-2xl h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <div className="text-sm font-semibold">Preview</div>
                          <Badge variant="outline" className="text-xs">Live</Badge>
                        </div>
                        <div className="flex-1 p-3">
                          <PreviewPane shortcut={shortcut} className="border-transparent bg-transparent shadow-none" />
                        </div>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                ref={assistantPanelRef}
                defaultSize={40}
                minSize={24}
                collapsible
                collapsedSize={0}
              >
                <>
                  {isAssistantExpanded && (
                    <div
                      className="fixed inset-0 bg-black/40 z-40"
                      onClick={() => setIsAssistantExpanded(false)}
                    />
                  )}
                  <aside
                    className={`border-l bg-card/70 backdrop-blur-xl flex flex-col transition-all duration-200 h-full ${
                      isAssistantExpanded
                        ? 'fixed inset-6 z-50 rounded-2xl shadow-2xl'
                        : ''
                    }`}
                  >
                    <Tabs value={sidePanelTab} onValueChange={(value) => setSidePanelTab(value as SidePanelTab)} className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <TabsList className="grid w-full grid-cols-2 rounded-full">
                          <TabsTrigger value="assistant" className="text-xs">Assistant</TabsTrigger>
                          <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
                        </TabsList>
                        <div className="ml-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsAssistantExpanded(!isAssistantExpanded)}
                          >
                            {isAssistantExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsSidePanelOpen(false);
                              setIsAssistantExpanded(false);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-hidden">
                        <TabsContent value="assistant" className="h-full min-h-0 mt-0">
                          <ChatThread
                            currentShortcut={shortcut}
                            onShortcutUpdate={handleChatShortcutUpdate}
                            model={model}
                            freshSession
                            autoFocus={false}
                          />
                        </TabsContent>
                        <TabsContent value="analysis" className="h-full min-h-0 mt-0">
                          <div className="h-full p-4">
                            {showAnalysis ? (
                              <AnalysisPane analysis={analysis} className="border-transparent bg-transparent shadow-none" />
                            ) : (
                              <div className="panel-surface rounded-2xl h-full flex items-center justify-center text-center px-6">
                                <div className="space-y-3">
                                  <BarChart2 className="h-8 w-8 text-muted-foreground mx-auto" />
                                  <div className="text-sm font-medium">Insights appear after processing</div>
                                  <p className="text-xs text-muted-foreground">
                                    Generate or analyze a shortcut to populate insights here.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </aside>
                </>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="h-full px-6 py-6">
              <div className="panel-surface rounded-2xl h-full overflow-auto p-6">
                <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shortcut={shortcut}
      />
    </div>
  );
}
