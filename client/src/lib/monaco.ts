import * as monaco from 'monaco-editor';

export const shortcutTheme = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'action', foreground: '007AFF' },
    { token: 'parameter', foreground: '5856D6' },
    { token: 'string', foreground: '34C759' },
    { token: 'number', foreground: 'FF9500' },
  ],
  colors: {
    'editor.background': '#F2F2F7',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#E5E5EA',
    'editorCursor.foreground': '#007AFF',
    'editor.selectionBackground': '#007AFF33',
  }
};

export const shortcutLanguageConfig: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ]
};

// Configure Monaco Editor workers
self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, label: string) {
    const workerPath = '/monaco-editor/esm/vs/';
    
    switch (label) {
      case 'json':
        return `${workerPath}language/json/json.worker.js`;
      case 'typescript':
      case 'javascript':
        return `${workerPath}language/typescript/ts.worker.js`;
      default:
        return `${workerPath}editor/editor.worker.js`;
    }
  },
};

export function registerShortcutLanguage() {
  monaco.languages.register({ id: 'shortcut' });
  
  monaco.languages.setMonarchTokensProvider('shortcut', {
    tokenizer: {
      root: [
        [/"[^"]*"/, 'string'],
        [/\d+/, 'number'],
        [/[A-Z][a-zA-Z]*Action/, 'action'],
        [/[a-zA-Z]+Parameter/, 'parameter'],
      ]
    }
  });

  monaco.languages.setLanguageConfiguration('shortcut', shortcutLanguageConfig);
  monaco.editor.defineTheme('shortcut-theme', shortcutTheme);
}
