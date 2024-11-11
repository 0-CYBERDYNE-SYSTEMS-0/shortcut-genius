import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { registerShortcutLanguage } from '@/lib/monaco';
import { Card } from '@/components/ui/card';

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      registerShortcutLanguage();

      editor.current = monaco.editor.create(editorRef.current, {
        value,
        language: 'shortcut',
        theme: 'shortcut-theme',
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      editor.current.onDidChangeModelContent(() => {
        onChange(editor.current?.getValue() || '');
      });

      return () => {
        editor.current?.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (editor.current && value !== editor.current.getValue()) {
      editor.current.setValue(value);
    }
  }, [value]);

  return (
    <Card className="h-full overflow-hidden">
      <div ref={editorRef} className="h-full w-full" />
    </Card>
  );
}
