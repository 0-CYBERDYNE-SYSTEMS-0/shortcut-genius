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

  return (
    <Card className={`h-full ${className || ''}`}>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">{shortcut.name}</h2>

          <div className="space-y-2">
            {actions.map((action, index) => (
              <div
                key={getActionKey(action, index)}
                className="bg-secondary rounded-lg p-3 flex flex-col gap-2"
              >
                <div className="font-medium text-primary">
                  {action.type}
                </div>
                
                {Object.entries(action.parameters).map(([key, value]) => (
                  <div
                    key={key}
                    className="text-sm text-muted-foreground flex justify-between"
                  >
                    <span>{key}:</span>
                    <span className="font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
