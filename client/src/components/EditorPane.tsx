import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { registerShortcutLanguage } from '@/lib/monaco';
import { Card } from '@/components/ui/card';
import { useBreakpoint } from '@/hooks/use-mobile';

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { isMobile, isTablet, isTouch } = useBreakpoint();

  useEffect(() => {
    if (editorRef.current) {
      registerShortcutLanguage();

      // Mobile-optimized editor configuration
      const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        value,
        language: 'shortcut',
        theme: 'shortcut-theme',
        minimap: { enabled: !isMobile },
        fontSize: isMobile ? 16 : (isTablet ? 15 : 14),
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineNumbers: isMobile ? 'off' : 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: isMobile ? 'on' : 'off',
        wordWrapColumn: isMobile ? 80 : 0,
        wrappingIndent: 'indent',
        // Mobile-specific optimizations
        mouseWheelZoom: isTouch,
        multiCursorModifier: 'ctrlCmd',
        quickSuggestions: !isMobile,
        suggestOnTriggerCharacters: !isMobile,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        formatOnPaste: true,
        formatOnType: true,
        // Touch-friendly settings
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: isMobile ? 'none' : 'line',
        renderWhitespace: isMobile ? 'none' : 'selection',
        // Performance optimizations for mobile
        maxTokenizationLineLength: isMobile ? 500 : 20000,
      };

      editor.current = monaco.editor.create(editorRef.current, editorOptions);

      editor.current.onDidChangeModelContent(() => {
        onChange(editor.current?.getValue() || '');
      });

      // Mobile-specific editor adjustments
      if (isMobile) {
        // Disable some features that don't work well on mobile
        editor.current.updateOptions({
          codeLens: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
        });

        // Add mobile-specific commands if needed
        editor.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          // Save functionality could be added here
        });
      }

      return () => {
        editor.current?.dispose();
      };
    }
  }, [isMobile, isTablet, isTouch]);

  useEffect(() => {
    if (editor.current && value !== editor.current.getValue()) {
      // Preserve cursor position when updating content
      const position = editor.current.getPosition();
      editor.current.setValue(value);
      if (position) {
        editor.current.setPosition(position);
      }
    }
  }, [value]);

  return (
    <Card className={`h-full overflow-hidden ${isMobile ? 'rounded-none border-x-0 border-t-0' : ''}`}>
      <div
        ref={editorRef}
        className={`h-full w-full ${isMobile ? 'touch-manipulation' : ''}`}
        style={{
          // Ensure proper touch handling on mobile
          touchAction: isMobile ? 'manipulation' : 'auto',
        }}
      />
    </Card>
  );
}
