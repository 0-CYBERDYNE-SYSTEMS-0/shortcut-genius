export interface ShortcutAction {
  type: string;
  parameters: Record<string, any>;
}

export interface Shortcut {
  name: string;
  actions: ShortcutAction[];
}

export function parseShortcutFile(content: string): Shortcut {
  try {
    const parsed = JSON.parse(content);
    return {
      name: parsed.name || 'Untitled Shortcut',
      actions: parsed.actions || []
    };
  } catch (error) {
    throw new Error('Invalid shortcut file format');
  }
}

export function exportShortcut(shortcut: Shortcut): string {
  return JSON.stringify(shortcut, null, 2);
}

export const SHORTCUT_ACTIONS = {
  text: {
    name: 'Text',
    parameters: ['text']
  },
  number: {
    name: 'Number',
    parameters: ['value']
  },
  ask: {
    name: 'Ask for Input',
    parameters: ['prompt', 'defaultValue']
  },
  // Add more action types as needed
};

export function validateShortcut(shortcut: Shortcut): string[] {
  const errors: string[] = [];
  
  if (!shortcut.name) {
    errors.push('Shortcut name is required');
  }
  
  shortcut.actions.forEach((action, index) => {
    if (!SHORTCUT_ACTIONS[action.type]) {
      errors.push(`Invalid action type at index ${index}: ${action.type}`);
    }
  });
  
  return errors;
}
