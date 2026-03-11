import { useRef, useState } from 'react';
import { FileUp, FlaskConical, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ShortcutImportIntent } from '@/lib/shortcuts';

interface FileUploadProps {
  onUpload: (file: File, importIntent: ShortcutImportIntent) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importIntent, setImportIntent] = useState<ShortcutImportIntent>('reference');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload(file, importIntent);
    event.target.value = '';
    setOpen(false);
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept=".shortcut,.json,.plist,.xml"
        className="hidden"
      />

      <Button variant="secondary" onClick={() => setOpen(true)}>
        Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-accent-aqua" />
              Import Shortcut Artifact
            </DialogTitle>
            <DialogDescription>
              Desktop-first import for JSON, plist, and `.shortcut` files, with an explicit intent for how the app should treat the artifact.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setImportIntent('reference')}
              className={`rounded-2xl border p-4 text-left transition-colors ${importIntent === 'reference' ? 'border-primary bg-primary/5' : 'border-border bg-background/70'}`}
            >
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-accent-indigo" />
                <span className="font-medium">Reference shortcut</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the imported shortcut as working source material and reference code for editing and generation.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setImportIntent('debug')}
              className={`rounded-2xl border p-4 text-left transition-colors ${importIntent === 'debug' ? 'border-primary bg-primary/5' : 'border-border bg-background/70'}`}
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-accent-coral" />
                <span className="font-medium">Debug artifact</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Treat the import as a troubleshooting artifact to preserve, inspect, and use in debug-loop repair flows.
              </p>
            </button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Supported formats</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">JSON</Badge>
              <Badge variant="outline">plist</Badge>
              <Badge variant="outline">.shortcut</Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
