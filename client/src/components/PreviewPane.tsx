import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shortcut, ShortcutAction } from '@/lib/shortcuts';

interface PreviewPaneProps {
  shortcut: Shortcut;
  className?: string;
}

export function PreviewPane({ shortcut, className }: PreviewPaneProps) {
  const [actions, setActions] = useState<ShortcutAction[]>([]);

  useEffect(() => {
    setActions(shortcut.actions);
  }, [shortcut]);

  // Generate stable key for action items
  const getActionKey = (action: ShortcutAction, index: number): string => {
    // Create a stable key using action type and parameter hash
    const paramHash = JSON.stringify(action.parameters);
    return `${action.type}-${index}-${paramHash.substring(0, 20)}`;
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  return (
    <Card className={`flex h-full min-h-0 flex-col ${className || ''}`}>
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="text-accent-indigo text-xs uppercase tracking-[0.2em]">Shortcut summary</div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{shortcut.name}</h2>
                <p className="text-accent-indigo text-sm">
                  {actions.length > 0
                    ? `${actions.length} actions arranged in execution order.`
                    : 'No actions yet. Generate or import a shortcut to preview its flow.'}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
                <div className="text-accent-indigo">Actions</div>
                <div className="text-lg font-semibold">{actions.length}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {actions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-background/80 p-6 text-center text-sm text-muted-foreground">
                The live preview will appear here once the shortcut has actions.
              </div>
            ) : (
              actions.map((action, index) => (
                <div
                  key={getActionKey(action, index)}
                  className="rounded-xl border border-border/70 bg-secondary/70 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-accent-indigo text-xs uppercase tracking-[0.2em]">
                        Step {index + 1}
                      </div>
                      <div className="break-words font-medium text-primary">{action.type}</div>
                    </div>
                    <div className="shrink-0 rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-muted-foreground">
                      {Object.keys(action.parameters).length} fields
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(action.parameters).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex flex-col gap-1 rounded-lg bg-background/80 px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                      >
                        <span className="min-w-0 text-muted-foreground break-words sm:max-w-[40%]">{key}</span>
                        <span className="min-w-0 break-all font-mono text-left sm:max-w-[58%] sm:text-right">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
