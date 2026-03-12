import { useMemo, useState } from 'react';
import { AlertCircle, Copy, FileCode2, Link2, List, Loader2, Search, ShieldCheck, Terminal } from 'lucide-react';

import type { Shortcut } from '@/lib/shortcuts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Primitive =
  | 'validate'
  | 'format-json'
  | 'format-plist'
  | 'extract-actions'
  | 'extract-urls'
  | 'extract-key-path'
  | 'xpath';

type SourceMode = 'current-shortcut' | 'current-plist' | 'pasted';
type RawFormat = 'auto' | 'json' | 'plist' | 'xml';

interface PrimitiveResult {
  title: string;
  summary: string;
  output: string;
  language: 'text' | 'json' | 'xml' | 'bash';
  sourceFormat: 'json' | 'plist' | 'shortcut' | 'xml' | 'unknown';
  suggestedCommands: string[];
}

interface DebugConsoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
}

const PRIMITIVES: Array<{
  id: Primitive;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  { id: 'validate', label: 'Validate', description: 'Run structural and compatibility checks.', icon: ShieldCheck },
  { id: 'format-json', label: 'Format JSON', description: 'Pretty-print the source as JSON.', icon: FileCode2 },
  { id: 'format-plist', label: 'Format PLIST', description: 'Render plist/XML for inspection.', icon: FileCode2 },
  { id: 'extract-actions', label: 'Extract actions', description: 'List action identifiers and counts.', icon: List },
  { id: 'extract-urls', label: 'Extract URLs', description: 'Find URLs across parameters and raw artifacts.', icon: Link2 },
  { id: 'extract-key-path', label: 'Key path', description: 'Query JSON/plist objects by dotted path.', icon: Search },
  { id: 'xpath', label: 'XPath', description: 'Query XML/plist source text with XPath.', icon: Search },
];

export function DebugConsoleDialog({ open, onOpenChange, shortcut }: DebugConsoleDialogProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('current-shortcut');
  const [rawFormat, setRawFormat] = useState<RawFormat>('auto');
  const [rawInput, setRawInput] = useState('');
  const [query, setQuery] = useState('');
  const [activePrimitive, setActivePrimitive] = useState<Primitive>('validate');
  const [result, setResult] = useState<PrimitiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primitiveMeta = useMemo(
    () => PRIMITIVES.find((primitive) => primitive.id === activePrimitive) || PRIMITIVES[0],
    [activePrimitive]
  );

  const supportsXPath = sourceMode !== 'current-shortcut';
  const requiresQuery = activePrimitive === 'extract-key-path' || activePrimitive === 'xpath';

  const sourceHint = sourceMode === 'current-shortcut'
    ? 'Runs primitives against the live shortcut JSON in the editor.'
    : sourceMode === 'current-plist'
      ? 'Runs primitives against the preserved plist, or a plist built from the current shortcut.'
      : 'Paste JSON, plist, or XML to inspect ad hoc artifacts and returned debug payloads.';

  const queryPlaceholder = activePrimitive === 'xpath'
    ? '//key[text()="WFWorkflowActionIdentifier"]/following-sibling::*[1]'
    : 'WFWorkflowActions[*].WFWorkflowActionIdentifier';

  const handleRun = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug-tools/primitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primitive: activePrimitive,
          sourceMode,
          rawFormat,
          rawInput,
          query,
          shortcut,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to run primitive');
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to run primitive');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-w-6xl overflow-hidden p-0">
        <div className="grid h-full min-h-0 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-hidden border-b border-border/70 bg-card/90 lg:border-b-0 lg:border-r">
            <ScrollArea className="h-full">
              <div className="p-5">
                <DialogHeader className="space-y-3 text-left">
                  <DialogTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-accent-indigo" />
                    Debug Console
                  </DialogTitle>
                  <DialogDescription>
                    Run constrained inspection primitives on the current shortcut, preserved plist, or pasted JSON/XML.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-5 space-y-4 pb-5">
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <Label className="text-xs uppercase tracking-[0.18em] text-accent-indigo">Source</Label>
                    <div className="mt-3 grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSourceMode('current-shortcut')}
                        className={cn(
                          'justify-start rounded-none border-2 shadow-none',
                          sourceMode === 'current-shortcut' && 'border-accent-pink bg-accent-pink/10 text-accent-pink'
                        )}
                      >
                        Current shortcut JSON
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSourceMode('current-plist')}
                        className={cn(
                          'justify-start rounded-none border-2 shadow-none',
                          sourceMode === 'current-plist' && 'border-accent-aqua bg-accent-aqua/10 text-accent-aqua'
                        )}
                      >
                        Current plist / shortcut artifact
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSourceMode('pasted')}
                        className={cn(
                          'justify-start rounded-none border-2 shadow-none',
                          sourceMode === 'pasted' && 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo'
                        )}
                      >
                        Pasted artifact
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{sourceHint}</p>
                  </div>

                  {sourceMode === 'pasted' && (
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-[0.18em] text-accent-indigo">Format</Label>
                          <Select value={rawFormat} onValueChange={(value) => setRawFormat(value as RawFormat)}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto-detect</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="plist">PLIST</SelectItem>
                              <SelectItem value="xml">XML</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.18em] text-accent-indigo">Artifact</Label>
                          <Textarea
                            value={rawInput}
                            onChange={(event) => setRawInput(event.target.value)}
                            className="mt-2 min-h-[180px] font-mono text-xs"
                            placeholder="Paste JSON, plist, or XML here."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-accent-coral">Primitives</div>
                    <div className="mt-3 grid gap-2">
                      {PRIMITIVES.filter((primitive) => supportsXPath || primitive.id !== 'xpath').map((primitive) => {
                        const Icon = primitive.icon;
                        return (
                          <button
                            key={primitive.id}
                            type="button"
                            onClick={() => setActivePrimitive(primitive.id)}
                            className={cn(
                              'rounded-xl border border-border/70 bg-secondary/40 px-3 py-3 text-left transition-colors hover:bg-secondary/70',
                              activePrimitive === primitive.id && 'border-primary/60 bg-primary/5'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className="mt-0.5 h-4 w-4 text-accent-indigo" />
                              <div>
                                <div className="font-medium">{primitive.label}</div>
                                <div className="text-sm text-muted-foreground">{primitive.description}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {requiresQuery && (
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <Label className="text-xs uppercase tracking-[0.18em] text-accent-indigo">
                        {activePrimitive === 'xpath' ? 'XPath query' : 'Key path'}
                      </Label>
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="mt-2 font-mono text-xs"
                        placeholder={queryPlaceholder}
                      />
                    </div>
                  )}

                  <Button onClick={handleRun} disabled={loading} className="w-full rounded-none">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Terminal className="mr-2 h-4 w-4" />}
                    Run {primitiveMeta.label}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="min-h-0 overflow-hidden bg-background/95 p-5">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="output" className="flex h-full min-h-0 flex-col">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-accent-indigo">Console output</div>
                  <div className="mt-1 text-lg font-semibold">{result?.title || primitiveMeta.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result?.summary || 'Run a primitive to inspect structure, formatting, validation, and extractable data.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {result && <Badge variant="outline">{result.sourceFormat}</Badge>}
                  <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!result?.output}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy output
                  </Button>
                </div>
              </div>

              <TabsList className="grid w-full grid-cols-2 rounded-none bg-muted/60">
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="cli">CLI</TabsTrigger>
              </TabsList>

              <TabsContent value="output" className="min-h-0 flex-1">
                <div className="grid h-full min-h-0 gap-4">
                  <div className="rounded-2xl border border-border/70 bg-slate-950 text-slate-100">
                    <ScrollArea className="h-[52vh]">
                      <pre className="min-h-full whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6">
                        {result?.output || 'No output yet.'}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cli" className="min-h-0 flex-1">
                <div className="rounded-2xl border border-border/70 bg-background/80">
                  <ScrollArea className="h-[52vh]">
                    <div className="p-4">
                      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-accent-coral">Suggested CLI</div>
                      <div className="space-y-2">
                        {(result?.suggestedCommands || []).length > 0 ? (
                          result?.suggestedCommands.map((command) => (
                            <div
                              key={command}
                              className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-3 font-mono text-xs"
                            >
                              {command}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-sm text-muted-foreground">
                            Run a primitive to see the matching shell commands.
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
