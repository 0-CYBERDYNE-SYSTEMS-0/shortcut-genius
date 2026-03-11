import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import { AnalysisPane } from '@/components/AnalysisPane';
import { ShortcutsGallery } from '@/components/ShortcutsGallery';
import { ReasoningControls } from '@/components/ReasoningControls';
import { TestRunner } from '@/components/TestRunner';
import { ProviderSettings } from '@/components/ProviderSettings';
import { FileUpload } from '@/components/FileUpload';
import { ModelSelector } from '@/components/ModelSelector';
import { ShareDialog } from '@/components/ShareDialog';
import { DebugSessionDialog } from '@/components/DebugSessionDialog';
import { ThemeToggle } from '@/components/theme-toggle';
import ChatThread from '@/components/ChatThread';
import { useToast } from '@/hooks/use-toast';
import { useBreakpoint } from '@/hooks/use-mobile';
import { AIModel, ReasoningOptions } from '@/lib/types';
import {
  DEFAULT_REASONING_OPTIONS,
  getModelConfig,
  supportsReasoning,
  supportsVerbosity
} from '@/lib/models';
import { processWithAI } from '@/lib/ai';
import { Shortcut, ShortcutImportIntent, exportShortcut, importShortcutArtifact } from '@/lib/shortcuts';
import { analyzeShortcut } from '@/lib/shortcut-analyzer';
import { cn } from '@/lib/utils';
import {
  BarChart2,
  Bot,
  Bug,
  Code2,
  Download,
  GalleryVerticalEnd,
  LayoutGrid,
  MoreVertical,
  PlayCircle,
  Settings2,
  Share2,
  Sparkles,
  Wand2
} from 'lucide-react';

const DEFAULT_SHORTCUT: Shortcut = {
  name: 'New Shortcut',
  actions: []
};

const API_NETWORK_PROBE_TEMPLATE: Shortcut = {
  name: 'API Network Probe',
  actions: [
    { type: 'url', parameters: { url: 'https://jsonplaceholder.typicode.com/todos/1' } },
    { type: 'is.workflow.actions.getcontentsofurl', parameters: { WFHTTPMethod: 'GET' } },
    { type: 'is.workflow.actions.showresult', parameters: { WFShowResultActionText: 'Inspect the returned JSON payload.' } }
  ]
};

type WorkspaceMode = 'build' | 'library';
type BuildSurface = 'assistant' | 'preview' | 'editor';
type InspectorPanel = 'insights' | 'test' | 'model' | null;

interface InspectorPanelProps {
  panel: InspectorPanel;
  analysis: ReturnType<typeof analyzeShortcut>;
  model: AIModel;
  reasoningOptions: ReasoningOptions;
  onReasoningOptionsChange: (options: ReasoningOptions) => void;
  shortcut: Shortcut;
}

function InspectorPanelContent({
  panel,
  analysis,
  model,
  reasoningOptions,
  onReasoningOptionsChange,
  shortcut,
}: InspectorPanelProps) {
  if (panel === 'test') {
    return <TestRunner shortcut={shortcut} />;
  }

  if (panel === 'model') {
    const cfg = getModelConfig(model);

    return (
      <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
          <div className="text-accent-indigo text-xs uppercase tracking-[0.22em]">Active model</div>
          <div className="mt-2 space-y-1">
            <div className="text-lg font-semibold">{cfg.name}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {cfg.provider} · {cfg.category}
            </div>
            <div className="text-sm text-muted-foreground">
              Context window: {(cfg.capabilities.contextWindow / 1000).toFixed(0)}k tokens
            </div>
          </div>
        </div>

        {(supportsReasoning(model) || supportsVerbosity(model)) && (
          <ReasoningControls
            model={model}
            options={reasoningOptions}
            onChange={onReasoningOptionsChange}
          />
        )}

        <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <div className="text-accent-coral mb-3 text-xs uppercase tracking-[0.22em]">Providers</div>
          <ProviderSettings />
        </div>
      </div>
    );
  }

  return <AnalysisPane analysis={analysis} />;
}

export function Editor() {
  const [model, setModel] = useState<AIModel>('minimax/minimax-m2.1');
  const [reasoningOptions, setReasoningOptions] = useState<ReasoningOptions>(DEFAULT_REASONING_OPTIONS);
  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [code, setCode] = useState(JSON.stringify(DEFAULT_SHORTCUT, null, 2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('build');
  const [buildSurface, setBuildSurface] = useState<BuildSurface>('assistant');
  const [inspectorPanel, setInspectorPanel] = useState<InspectorPanel>('insights');
  const [isDesktopInspectorOpen, setIsDesktopInspectorOpen] = useState(true);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [chatSessionKey] = useState(() => `editor-session-${Date.now()}`);
  const { toast } = useToast();
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useBreakpoint();

  const actionCount = shortcut.actions.length;
  const hasShortcut = actionCount > 0;
  const analysis = useMemo(() => analyzeShortcut(shortcut), [shortcut]);
  const shortcutProvenance = shortcut._provenance;
  const isWideLayout = isDesktop || isLargeDesktop;
  const desktopCanvasSurface = buildSurface === 'editor' ? 'editor' : 'preview';
  const showInlineInspector = isWideLayout && isDesktopInspectorOpen && inspectorPanel !== null;

  const updateShortcutFromCode = (value: string) => {
    setCode(value);

    try {
      const parsed = JSON.parse(value);
      setShortcut((current) => ({
        ...parsed,
        _provenance: parsed._provenance || current._provenance
      }));
    } catch {
      // Keep the editor editable while the JSON is temporarily invalid.
    }
  };

  const openInspector = (panel: Exclude<InspectorPanel, null>) => {
    setInspectorPanel(panel);

    if (isWideLayout) {
      setIsDesktopInspectorOpen(true);
      return;
    }

    setIsMobileInspectorOpen(true);
  };

  const handleImport = async (file: File, importIntent: ShortcutImportIntent) => {
    try {
      const imported = await importShortcutArtifact(file, importIntent);
      setShortcut(imported.shortcut);
      setCode(JSON.stringify(imported.shortcut, null, 2));
      setWorkspaceMode('build');
      setBuildSurface(isWideLayout ? 'preview' : 'assistant');
      setShowAnalysis(true);
      openInspector('insights');

      toast({
        title: 'Shortcut imported',
        description: imported.metadata.warnings[0] || `${imported.metadata.sourceFormat.toUpperCase()} imported as ${importIntent === 'debug' ? 'debug artifact' : 'reference shortcut'}.`
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'destructive'
      });
    }
  };

  const loadStarterTemplate = () => {
    setShortcut(API_NETWORK_PROBE_TEMPLATE);
    setCode(JSON.stringify(API_NETWORK_PROBE_TEMPLATE, null, 2));
    setWorkspaceMode('build');
    setBuildSurface(isWideLayout ? 'preview' : 'assistant');
    openInspector('insights');
    toast({
      title: 'Starter loaded',
      description: 'Loaded the known-good API / Network Probe shortcut for debugging and iteration.'
    });
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

  const handleExportPlist = async () => {
    if (!hasShortcut) return;

    try {
      await downloadShortcutBlob(
        { shortcut, sign: false, format: 'plist' },
        `${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}.plist`
      );
    } catch (error) {
      toast({
        title: 'PLIST export failed',
        description: error instanceof Error ? error.message : 'Failed to export plist',
        variant: 'destructive'
      });
    }
  };

  const downloadShortcutBlob = async (
    payload: { shortcut: Shortcut; sign: boolean; signMode?: string; format?: 'plist' | 'binary' | 'shortcut' },
    fileName: string
  ) => {
    const response = await fetch('/api/shortcuts/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to build shortcut');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadShortcut = async () => {
    if (!hasShortcut) return;

    try {
      await downloadShortcutBlob(
        { shortcut, sign: true, signMode: 'anyone' },
        `${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.shortcut`
      );
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to build shortcut',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadSignedShortcut = async () => {
    if (!hasShortcut) return;

    try {
      await downloadShortcutBlob(
        { shortcut, sign: true },
        `${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.shortcut`
      );
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
        title: 'Analysis complete',
        description: response.content
      });

      setWorkspaceMode('build');
      setShowAnalysis(true);
      setBuildSurface(isWideLayout ? 'preview' : 'assistant');
      openInspector('insights');
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

  const handleImportFromGallery = (_shortcutUrl: string) => {
    setWorkspaceMode('build');
    setBuildSurface('assistant');
    toast({
      title: 'Import from gallery',
      description: 'Gallery import is still pending, but the library flow is now separated from the main builder.'
    });
  };

  const handleChatShortcutUpdate = (updatedShortcut: Shortcut) => {
    const nextShortcut = {
      ...updatedShortcut,
      _provenance: updatedShortcut._provenance || shortcut._provenance
    };

    setShortcut(nextShortcut);
    setCode(JSON.stringify(nextShortcut, null, 2));
    setWorkspaceMode('build');
    setBuildSurface(isWideLayout ? 'preview' : 'assistant');
    setShowAnalysis(true);
    openInspector('insights');

    toast({
      title: 'Shortcut updated',
      description: 'The current shortcut was updated from the assistant conversation.'
    });
  };

  const handleApplyDebugShortcut = (updatedShortcut: Shortcut) => {
    const nextShortcut = {
      ...updatedShortcut,
      _provenance: updatedShortcut._provenance || shortcut._provenance
    };

    setShortcut(nextShortcut);
    setCode(JSON.stringify(nextShortcut, null, 2));
    setWorkspaceMode('build');
    setBuildSurface(isWideLayout ? 'editor' : 'assistant');
    openInspector('insights');
  };

  const renderCanvas = (surface: 'preview' | 'editor') => {
    if (surface === 'editor') {
      return (
        <div className="panel-surface flex h-full flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-accent-aqua text-xs uppercase tracking-[0.2em]">Refine</div>
              <div className="text-base font-semibold">JSON editor</div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
              Advanced
            </Badge>
          </div>
          <div className="flex-1 p-3">
            <EditorPane
              value={code}
              onChange={updateShortcutFromCode}
              className="h-full border-transparent bg-transparent shadow-none"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="panel-surface flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-accent-aqua text-xs uppercase tracking-[0.2em]">Refine</div>
            <div className="text-base font-semibold">Preview</div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
            Live
          </Badge>
        </div>
        <div className="flex-1 p-3">
          <PreviewPane shortcut={shortcut} className="border-transparent bg-transparent shadow-none" />
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell flex min-h-screen flex-col text-foreground">
      <header className="border-b-2 border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="text-accent-indigo text-xs uppercase tracking-[0.32em]">Shortcut Genius</div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{shortcut.name}</h1>
                <Badge variant="outline" className="text-accent-pink border-current text-[10px] uppercase tracking-[0.16em]">
                  AI-first builder
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {actionCount} actions
                </Badge>
                {shortcutProvenance && (
                  <Badge variant="outline" className="text-xs uppercase tracking-[0.12em]">
                    {shortcutProvenance.sourceFormat}
                    {shortcutProvenance.importIntent ? ` · ${shortcutProvenance.importIntent}` : ''}
                  </Badge>
                )}
                {isProcessing && (
                  <Badge variant="outline" className="text-xs">
                    Analyzing...
                  </Badge>
                )}
              </div>
              <p className="text-accent-indigo max-w-3xl text-sm">
                Describe the shortcut, refine the output, then validate it without switching mental models between screens.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="w-full sm:w-auto">
                  <ModelSelector value={model} onChange={setModel} />
                </div>
                <FileUpload onUpload={handleImport} />
                <Button onClick={handleProcess} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={handleDownloadShortcut} disabled={!hasShortcut}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="secondary" onClick={() => setDebugDialogOpen(true)} disabled={!hasShortcut}>
                  <Bug className="mr-2 h-4 w-4" />
                  Debug loop
                </Button>
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" aria-label="More actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShareDialogOpen(true)} disabled={!hasShortcut}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport}>
                      Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPlist} disabled={!hasShortcut}>
                      Export PLIST
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadSignedShortcut} disabled={!hasShortcut}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Signed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={workspaceMode === 'build' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setWorkspaceMode('build')}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Build
                </Button>
                <Button
                  variant={workspaceMode === 'library' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setWorkspaceMode('library')}
                  className={workspaceMode !== 'library' ? 'text-accent-indigo' : undefined}
                >
                  <GalleryVerticalEnd className="mr-2 h-4 w-4" />
                  Library
                </Button>
              </div>
            </div>
          </div>

          {workspaceMode === 'build' && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-accent-pink mr-2 text-xs uppercase tracking-[0.2em]">Build surface</div>
                <Button
                  variant={buildSurface === 'assistant' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setBuildSurface('assistant')}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  Assistant
                </Button>
                <Button
                  variant={buildSurface === 'preview' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setBuildSurface('preview')}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant={buildSurface === 'editor' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setBuildSurface('editor')}
                >
                  <Code2 className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-accent-coral mr-2 text-xs uppercase tracking-[0.2em]">Validate</div>
                <Button
                  variant={inspectorPanel === 'insights' && (showInlineInspector || isMobileInspectorOpen) ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => openInspector('insights')}
                >
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Insights
                </Button>
                <Button
                  variant={inspectorPanel === 'test' && (showInlineInspector || isMobileInspectorOpen) ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => openInspector('test')}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Test
                </Button>
                <Button
                  variant={inspectorPanel === 'model' && (showInlineInspector || isMobileInspectorOpen) ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => openInspector('model')}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Model settings
                </Button>
                {showInlineInspector && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDesktopInspectorOpen(false)}
                  >
                    Hide panel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 lg:px-6 lg:py-6">
        {workspaceMode === 'library' ? (
          <div className="panel-surface flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl">
            <div className="border-b px-4 py-3">
              <div className="text-accent-indigo text-xs uppercase tracking-[0.2em]">Library</div>
              <div className="text-base font-semibold">Templates and shared shortcuts</div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-accent-aqua text-xs uppercase tracking-[0.2em]">Starter</div>
                    <div className="text-base font-semibold">API / Network Probe</div>
                    <p className="text-accent-indigo mt-1 text-sm">
                      Known-good request and output blocks for proving the debug loop before you iterate on custom flows.
                    </p>
                  </div>
                  <Button onClick={loadStarterTemplate}>
                    Load starter
                  </Button>
                </div>
              </div>
              <ShortcutsGallery onImportShortcut={handleImportFromGallery} />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'grid flex-1 gap-4 overflow-hidden',
              showInlineInspector
                ? 'lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)_320px]'
                : isWideLayout
                  ? 'lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.1fr)]'
                  : 'grid-cols-1'
            )}
          >
            {(isWideLayout || buildSurface === 'assistant') && (
              <div className="min-h-[420px] overflow-hidden">
                <div className={cn(
                  'panel-surface flex h-full flex-col overflow-hidden rounded-2xl',
                  buildSurface === 'assistant' && 'ring-2 ring-primary/30'
                )}>
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <div className="text-accent-pink text-xs uppercase tracking-[0.2em]">Describe</div>
                      <div className="text-accent-indigo text-base font-semibold">Assistant</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
                      Primary
                    </Badge>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ChatThread
                      currentShortcut={shortcut}
                      onShortcutUpdate={handleChatShortcutUpdate}
                      onOpenInspector={(panel) => openInspector(panel)}
                      model={model}
                      sessionKey={chatSessionKey}
                      autoFocus={!isWideLayout}
                    />
                  </div>
                </div>
              </div>
            )}

            {(isWideLayout || buildSurface !== 'assistant') && (
              <div className="min-h-[420px] overflow-hidden">
                <div className="mb-3 flex items-center gap-2 lg:hidden">
                  <Button
                    variant={buildSurface === 'preview' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setBuildSurface('preview')}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    variant={buildSurface === 'editor' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setBuildSurface('editor')}
                  >
                    <Code2 className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                </div>

                {isWideLayout ? (
                  <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)]">
                    <div className="mb-3 hidden items-center gap-2 lg:flex">
                      <Button
                        variant={desktopCanvasSurface === 'preview' ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setBuildSurface('preview')}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant={desktopCanvasSurface === 'editor' ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setBuildSurface('editor')}
                      >
                        <Code2 className="mr-2 h-4 w-4" />
                        JSON editor
                      </Button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      {renderCanvas(desktopCanvasSurface)}
                    </div>
                  </div>
                ) : (
                  renderCanvas(buildSurface === 'editor' ? 'editor' : 'preview')
                )}
              </div>
            )}

            {showInlineInspector && inspectorPanel !== null && (
              <aside className="min-h-[420px] overflow-hidden">
                <div className="panel-surface flex h-full flex-col overflow-hidden rounded-2xl">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <div className="text-accent-coral text-xs uppercase tracking-[0.2em]">Validate</div>
                      <div className="text-base font-semibold">
                        {inspectorPanel === 'insights'
                          ? 'Insights'
                          : inspectorPanel === 'test'
                            ? 'Runtime test'
                            : 'Model settings'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
                      Inspector
                    </Badge>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-3">
                    <InspectorPanelContent
                      panel={inspectorPanel}
                      analysis={analysis}
                      model={model}
                      reasoningOptions={reasoningOptions}
                      onReasoningOptionsChange={setReasoningOptions}
                      shortcut={shortcut}
                    />
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      <Sheet open={!showInlineInspector && isMobileInspectorOpen} onOpenChange={setIsMobileInspectorOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex h-[88vh] flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>
              {inspectorPanel === 'insights'
                ? 'Insights'
                : inspectorPanel === 'test'
                  ? 'Runtime test'
                  : 'Model settings'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <InspectorPanelContent
              panel={inspectorPanel}
              analysis={analysis}
              model={model}
              reasoningOptions={reasoningOptions}
              onReasoningOptionsChange={setReasoningOptions}
              shortcut={shortcut}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shortcut={shortcut}
      />

      <DebugSessionDialog
        open={debugDialogOpen}
        onOpenChange={setDebugDialogOpen}
        shortcut={shortcut}
        model={model}
        onShortcutApply={handleApplyDebugShortcut}
      />
    </div>
  );
}
