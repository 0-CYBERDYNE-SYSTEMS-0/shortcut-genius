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
  // Text & Input
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
  
  // Control Flow
  if: {
    name: 'If/Then/Else',
    parameters: ['condition', 'then', 'else']
  },
  repeat: {
    name: 'Repeat',
    parameters: ['count', 'actions']
  },
  wait: {
    name: 'Wait',
    parameters: ['seconds']
  },

  // Media
  play_sound: {
    name: 'Play Sound',
    parameters: ['soundName', 'volume']
  },
  record_audio: {
    name: 'Record Audio',
    parameters: ['duration', 'quality']
  },
  take_photo: {
    name: 'Take Photo',
    parameters: ['useFrontCamera', 'flash']
  },
  select_photos: {
    name: 'Select Photos',
    parameters: ['allowMultiple', 'includeVideos']
  },

  // Device
  set_volume: {
    name: 'Set Volume',
    parameters: ['level']
  },
  set_brightness: {
    name: 'Set Brightness',
    parameters: ['level']
  },
  set_do_not_disturb: {
    name: 'Set Do Not Disturb',
    parameters: ['enabled', 'duration']
  },

  // System
  url: {
    name: 'URL',
    parameters: ['url', 'method', 'headers']
  },
  notification: {
    name: 'Notification',
    parameters: ['title', 'body', 'sound']
  },
  files: {
    name: 'Files',
    parameters: ['path', 'content', 'operation']
  },

  // Calendar & Contacts
  calendar: {
    name: 'Calendar',
    parameters: ['action', 'title', 'date']
  },
  contacts: {
    name: 'Contacts',
    parameters: ['action', 'name', 'phone']
  },

  // Location & Maps
  get_location: {
    name: 'Get Location',
    parameters: ['accuracy']
  },
  get_directions: {
    name: 'Get Directions',
    parameters: ['destination', 'mode']
  },

  // Health
  log_health: {
    name: 'Log Health Data',
    parameters: ['type', 'value', 'unit']
  },
  get_health: {
    name: 'Get Health Samples',
    parameters: ['type', 'startDate', 'endDate']
  },

  // Home
  control_devices: {
    name: 'Control Devices',
    parameters: ['device', 'action', 'value']
  },
  get_device_state: {
    name: 'Get Device State',
    parameters: ['device']
  }
};

export function validateShortcut(shortcut: Shortcut): string[] {
  const errors: string[] = [];
  
  if (!shortcut.name) {
    errors.push('Shortcut name is required');
  }
  
  if (!Array.isArray(shortcut.actions)) {
    errors.push('Actions must be an array');
    return errors;
  }

  shortcut.actions.forEach((action, index) => {
    const actionType = SHORTCUT_ACTIONS[action.type];
    
    if (!actionType) {
      errors.push(`Invalid action type at index ${index}: ${action.type}`);
      return;
    }

    // Validate required parameters
    actionType.parameters.forEach(param => {
      if (!action.parameters.hasOwnProperty(param)) {
        errors.push(`Missing required parameter "${param}" for action "${action.type}" at index ${index}`);
      }
    });

    // Validate parameter types
    Object.entries(action.parameters).forEach(([key, value]) => {
      if (!actionType.parameters.includes(key)) {
        errors.push(`Unknown parameter "${key}" for action "${action.type}" at index ${index}`);
      }

      // Type-specific validations
      switch (key) {
        case 'level':
          if (typeof value !== 'number' || value < 0 || value > 100) {
            errors.push(`Invalid level value at index ${index}: must be a number between 0 and 100`);
          }
          break;
        case 'duration':
          if (typeof value !== 'number' || value <= 0) {
            errors.push(`Invalid duration value at index ${index}: must be a positive number`);
          }
          break;
        case 'enabled':
          if (typeof value !== 'boolean') {
            errors.push(`Invalid enabled value at index ${index}: must be a boolean`);
          }
          break;
      }
    });
  });
  
  return errors;
}
