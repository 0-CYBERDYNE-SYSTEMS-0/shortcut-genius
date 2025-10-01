import * as monaco from 'monaco-editor';

export const shortcutLightTheme: monaco.editor.IStandaloneThemeData = {
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

export const shortcutDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'action', foreground: '0A84FF' },
    { token: 'parameter', foreground: '64D2FF' },
    { token: 'string', foreground: '30D158' },
    { token: 'number', foreground: 'FF9F0A' },
  ],
  colors: {
    'editor.background': '#1C1C1E',
    'editor.foreground': '#FFFFFF',
    'editor.lineHighlightBackground': '#2C2C2E',
    'editorCursor.foreground': '#0A84FF',
    'editor.selectionBackground': '#0A84FF33',
    'editorWhitespace.foreground': '#48484A',
    'editorIndentGuide.background': '#2C2C2E',
    'editorIndentGuide.activeBackground': '#48484A',
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

// Configure Monaco Editor workers using JSDelivr CDN
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';

self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return `${CDN_BASE}/language/json/json.worker.js`;
      case 'typescript':
      case 'javascript':
        return `${CDN_BASE}/language/typescript/ts.worker.js`;
      default:
        return `${CDN_BASE}/editor/editor.worker.js`;
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
  monaco.editor.defineTheme('shortcut-light-theme', shortcutLightTheme);
  monaco.editor.defineTheme('shortcut-dark-theme', shortcutDarkTheme);
}
