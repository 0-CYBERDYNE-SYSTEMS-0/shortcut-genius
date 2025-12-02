import { z } from 'zod';

export interface ShortcutAction {
  type: string;
  parameters: Record<string, any>;
}

export interface Shortcut {
  name: string;
  actions: ShortcutAction[];
}

// Maximum allowed actions in a shortcut
const MAX_ACTIONS = 50;

// Permission levels for different action types
export const ACTION_PERMISSIONS = {
  text: 'none',
  number: 'none',
  ask: 'none',
  if: 'none',
  repeat: 'none',
  wait: 'none',
  play_sound: 'media',
  record_audio: 'media-record',
  take_photo: 'camera',
  select_photos: 'photo-library',
  set_volume: 'device',
  set_brightness: 'device',
  set_do_not_disturb: 'device',
  url: 'network',
  notification: 'notification',
  files: 'files',
  calendar: 'calendar',
  contacts: 'contacts',
  get_location: 'location',
  get_directions: 'location',
  log_health: 'health',
  get_health: 'health',
  control_devices: 'home',
  get_device_state: 'home'
} as const;

// Parameter validation schemas
const parameterSchemas = {
  text: z.string(),
  number: z.number(),
  level: z.number().min(0).max(100),
  duration: z.number().positive(),
  enabled: z.boolean(),
  url: z.string().url(),
  quality: z.enum(['low', 'medium', 'high']),
  flash: z.enum(['on', 'off', 'auto']),
  accuracy: z.enum(['best', 'reduced']),
  mode: z.enum(['driving', 'walking', 'transit']),
  action: z.enum(['create', 'read', 'update', 'on', 'off', 'toggle']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string(),
  unit: z.string(),
  device: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  value: z.number(),
  condition: z.string(),
  then: z.array(z.lazy(() => actionSchema)),
  else: z.array(z.lazy(() => actionSchema)).optional(),
  actions: z.array(z.lazy(() => actionSchema))
};

const actionSchema = z.object({
  type: z.string(),
  parameters: z.record(z.any())
});

// Test cases for common shortcut patterns
export const TEST_CASES = {
  basicInputOutput: {
    name: 'Basic Input/Output Test',
    actions: [
      { type: 'ask', parameters: { prompt: 'Enter your name', defaultValue: '' } },
      { type: 'text', parameters: { text: 'Hello, {input}!' } }
    ]
  },
  conditionalLogic: {
    name: 'Conditional Logic Test',
    actions: [
      { type: 'if', parameters: { 
        condition: '{time} > 12:00',
        then: [{ type: 'text', parameters: { text: 'Good afternoon' } }],
        else: [{ type: 'text', parameters: { text: 'Good morning' } }]
      }}
    ]
  },
  mediaHandling: {
    name: 'Media Handling Test',
    actions: [
      { type: 'take_photo', parameters: { useFrontCamera: false, flash: 'auto' } },
      { type: 'play_sound', parameters: { soundName: 'shutter', volume: 50 } }
    ]
  },
  deviceControl: {
    name: 'Device Control Test',
    actions: [
      { type: 'set_brightness', parameters: { level: 50 } },
      { type: 'set_volume', parameters: { level: 30 } }
    ]
  },
  healthData: {
    name: 'Health Data Test',
    actions: [
      { type: 'log_health', parameters: { type: 'steps', value: 1000, unit: 'steps' } },
      { type: 'get_health', parameters: { type: 'heart-rate', startDate: '2024-01-01', endDate: '2024-01-02' } }
    ]
  },
  homeAutomation: {
    name: 'Home Automation Test',
    actions: [
      { type: 'control_devices', parameters: { device: 'Living Room Lights', action: 'on', value: 80 } },
      { type: 'wait', parameters: { seconds: 300 } },
      { type: 'control_devices', parameters: { device: 'Living Room Lights', action: 'off' } }
    ]
  }
};

// Helper function to detect circular references in nested actions
function detectCircularReferences(actions: ShortcutAction[], path: string[] = []): string[] {
  const errors: string[] = [];
  
  actions.forEach((action, index) => {
    const currentPath = [...path, `${action.type}:${index}`];
    
    if (action.type === 'if' || action.type === 'repeat') {
      const nestedActions = action.type === 'if' 
        ? [...(action.parameters.then || []), ...(action.parameters.else || [])]
        : action.parameters.actions;
      
      if (path.includes(`${action.type}:${index}`)) {
        errors.push(`Circular reference detected in ${currentPath.join(' -> ')}`);
      } else {
        errors.push(...detectCircularReferences(nestedActions, currentPath));
      }
    }
  });
  
  return errors;
}

// Helper function for parameter sanitization
function sanitizeParameters(parameters: Record<string, any>): Record<string, any> {
  return Object.entries(parameters).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    
    switch (typeof value) {
      case 'number':
        acc[key] = Math.round(value * 100) / 100; // Round to 2 decimal places
        break;
      case 'string':
        acc[key] = value.trim();
        break;
      case 'boolean':
        acc[key] = Boolean(value);
        break;
      default:
        acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
}

// Helper function for formatting error messages
function formatError(type: string, message: string, index?: number): string {
  return index !== undefined
    ? `[Action ${index + 1}] ${type}: ${message}`
    : `${type}: ${message}`;
}

// Helper function for generating shortcut templates
export function generateTemplate(type: 'basic' | 'conditional' | 'media' | 'device' | 'health' | 'home'): Shortcut {
  const templateMap: Record<string, keyof typeof TEST_CASES> = {
    basic: 'basicInputOutput',
    conditional: 'conditionalLogic',
    media: 'mediaHandling',
    device: 'deviceControl',
    health: 'healthData',
    home: 'homeAutomation'
  };
  return TEST_CASES[templateMap[type]];
}

// Enhanced validation function
export function validateShortcut(shortcut: Shortcut): string[] {
  const errors: string[] = [];
  
  // Basic structure validation
  if (!shortcut.name) {
    errors.push(formatError('Structure', 'Shortcut name is required'));
  }
  
  if (!Array.isArray(shortcut.actions)) {
    errors.push(formatError('Structure', 'Actions must be an array'));
    return errors;
  }

  // Maximum action count validation
  if (shortcut.actions.length > MAX_ACTIONS) {
    errors.push(formatError('Limit', `Shortcut exceeds maximum allowed actions (${MAX_ACTIONS})`));
    return errors;
  }

  // Circular reference detection
  const circularErrors = detectCircularReferences(shortcut.actions);
  errors.push(...circularErrors);

  // Action validation
  const requiredPermissions = new Set<string>();
  
  // Create a reverse lookup map for iOS identifiers
  const identifierToAction: Record<string, keyof typeof SHORTCUT_ACTIONS> = {};
  Object.entries(SHORTCUT_ACTIONS).forEach(([key, config]) => {
    if (config.identifier) {
      identifierToAction[config.identifier] = key as keyof typeof SHORTCUT_ACTIONS;
    }
  });
  
  shortcut.actions.forEach((action, index) => {
    // Check action type - accept both simple names and iOS identifiers
    let actionType = SHORTCUT_ACTIONS[action.type as keyof typeof SHORTCUT_ACTIONS];
    let actionKey = action.type as keyof typeof SHORTCUT_ACTIONS;
    
    // If not found, check if it's an iOS identifier
    if (!actionType && identifierToAction[action.type]) {
      actionType = SHORTCUT_ACTIONS[identifierToAction[action.type]];
      actionKey = identifierToAction[action.type];
    }
    
    // Action type validation
    if (!actionType) {
      errors.push(formatError('Invalid Action', `Unknown action type: ${action.type}`, index));
      return;
    }

    // Permission tracking
    const permission = ACTION_PERMISSIONS[actionKey as keyof typeof ACTION_PERMISSIONS];
    if (permission && permission !== 'none') {
      requiredPermissions.add(permission);
    }

    // Parameter validation
    try {
      // First, map iOS parameter names to standard names
      const mappedParams = { ...action.parameters };
      if ((actionType as any).parameterMapping) {
        Object.entries((actionType as any).parameterMapping).forEach(([iosParam, standardParam]) => {
          if (mappedParams.hasOwnProperty(iosParam) && !mappedParams.hasOwnProperty(standardParam)) {
            mappedParams[standardParam] = mappedParams[iosParam];
            delete mappedParams[iosParam];
          }
        });
      }

      // Remove any remaining iOS parameters that don't have mappings
      const finalParams: Record<string, any> = {};
      (actionType as any).parameters.forEach((expectedParam: string) => {
        if (mappedParams.hasOwnProperty(expectedParam)) {
          finalParams[expectedParam] = mappedParams[expectedParam];
        }
      });

      // Also include any mapped parameters
      Object.entries(mappedParams).forEach(([key, value]) => {
        if ((actionType as any).parameters.includes(key)) {
          finalParams[key] = value;
        }
      });

      const sanitizedParams = sanitizeParameters(finalParams);
      action.parameters = sanitizedParams;

      actionType.parameters.forEach((param: string) => {
        if (!sanitizedParams.hasOwnProperty(param)) {
          errors.push(formatError('Parameters', `Missing required parameter: ${param}`, index));
        } else {
          const schema = parameterSchemas[param as keyof typeof parameterSchemas];
          if (schema) {
            try {
              schema.parse(sanitizedParams[param]);
            } catch (e) {
              if (e instanceof z.ZodError) {
                errors.push(formatError('Validation', `Invalid ${param}: ${e.errors[0].message}`, index));
              }
            }
          }
        }
      });

      // Extra parameter check
      Object.keys(sanitizedParams).forEach(param => {
        if (!actionType.parameters.includes(param)) {
          errors.push(formatError('Parameters', `Unknown parameter: ${param}`, index));
        }
      });

      // Nested action validation for if/repeat
      if (action.type === 'if' || action.type === 'repeat') {
        const nestedActions = action.type === 'if'
          ? [...(action.parameters.then || []), ...(action.parameters.else || [])]
          : action.parameters.actions;
        
        const nestedErrors = validateShortcut({ 
          name: `${shortcut.name}_nested`, 
          actions: nestedActions 
        });
        
        errors.push(...nestedErrors.map(error => formatError('Nested', error, index)));
      }
    } catch (error) {
      errors.push(formatError('Parameters', 'Invalid parameters structure', index));
    }
  });

  // Add permission requirements to errors
  if (requiredPermissions.size > 0) {
    errors.push(formatError('Permissions', `Required permissions: ${Array.from(requiredPermissions).join(', ')}`));
  }

  return errors;
}

export function parseShortcutFile(content: string): Shortcut {
  try {
    const parsed = JSON.parse(content);
    const shortcut = {
      name: parsed.name || 'Untitled Shortcut',
      actions: parsed.actions || []
    };

    const errors = validateShortcut(shortcut);
    if (errors.length > 0) {
      throw new Error(`Invalid shortcut:\n${errors.join('\n')}`);
    }

    return shortcut;
  } catch (error) {
    throw new Error(`Invalid shortcut file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function exportShortcut(shortcut: Shortcut): string {
  const errors = validateShortcut(shortcut);
  if (errors.length > 0) {
    throw new Error(`Cannot export invalid shortcut:\n${errors.join('\n')}`);
  }
  return JSON.stringify(shortcut, null, 2);
}

// iOS Shortcuts action configuration with parameter mappings
export type ShortcutActionConfig = {
  name: string;
  parameters: string[];
  identifier?: string;
  parameterMapping?: Record<string, string>;
};

export const SHORTCUT_ACTIONS: Record<string, ShortcutActionConfig> = {
  // Text & Input
  text: {
    name: 'Text',
    parameters: ['text'],
    identifier: 'is.workflow.actions.text'
  },
  number: {
    name: 'Number',
    parameters: ['value'],
    identifier: 'is.workflow.actions.number'
  },
  ask: {
    name: 'Ask for Input',
    parameters: ['prompt', 'defaultValue'],
    identifier: 'is.workflow.actions.ask',
    parameterMapping: {
      'WFAskActionPrompt': 'prompt',
      'WFAskActionDefaultAnswer': 'defaultValue'
    }
  },
  setvariable: {
    name: 'Set Variable',
    parameters: ['name', 'value'],
    identifier: 'is.workflow.actions.setvariable',
    parameterMapping: {
      'WFVariableName': 'name',
      'WFVariableInput': 'value'
    }
  },
  getvariable: {
    name: 'Get Variable',
    parameters: ['name'],
    identifier: 'is.workflow.actions.getvariable'
  },
  
  // Control Flow
  if: {
    name: 'If/Then/Else',
    parameters: ['condition', 'then', 'else'],
    identifier: 'is.workflow.actions.conditional'
  },
  repeat: {
    name: 'Repeat',
    parameters: ['count', 'actions'],
    identifier: 'is.workflow.actions.repeat'
  },
  wait: {
    name: 'Wait',
    parameters: ['seconds'],
    identifier: 'is.workflow.actions.wait'
  },

  // Media
  play_sound: {
    name: 'Play Sound',
    parameters: ['soundName', 'volume'],
    identifier: 'is.workflow.actions.play_sound'
  },
  record_audio: {
    name: 'Record Audio',
    parameters: ['duration', 'quality'],
    identifier: 'is.workflow.actions.record_audio',
    parameterMapping: {
      'WFRecordAudioTime': 'duration',
      'WFRecordAudioQuality': 'quality'
    }
  },
  take_photo: {
    name: 'Take Photo',
    parameters: ['useFrontCamera', 'flash'],
    identifier: 'is.workflow.actions.takephoto',
    parameterMapping: {
      'WFCameraCaptureDevice': 'useFrontCamera',
      'WFCameraFlash': 'flash'
    }
  },
  select_photos: {
    name: 'Select Photos',
    parameters: ['allowMultiple', 'includeVideos'],
    identifier: 'is.workflow.actions.selectphotos'
  },
  savephotolibrary: {
    name: 'Save to Photo Library',
    parameters: ['input', 'albumName'],
    identifier: 'is.workflow.actions.savephotolibrary',
    parameterMapping: {
      'WFInput': 'input',
      'WFPhotoAlbumName': 'albumName'
    }
  },

  // Device
  set_volume: {
    name: 'Set Volume',
    parameters: ['level'],
    parameterMapping: {
      'WFVolumeValue': 'level'
    }
  },
  set_brightness: {
    name: 'Set Brightness',
    parameters: ['level'],
    parameterMapping: {
      'WFBrightnessValue': 'level'
    }
  },
  set_do_not_disturb: {
    name: 'Set Do Not Disturb',
    parameters: ['enabled', 'duration'],
    parameterMapping: {
      'WFDoNotDisturbState': 'enabled',
      'WFDoNotDisturbDuration': 'duration'
    }
  },

  // System
  url: {
    name: 'URL',
    parameters: ['url', 'method', 'headers'],
    identifier: 'is.workflow.actions.url',
    parameterMapping: {
      'WFURLActionURL': 'url',
      'WFHTTPMethodType': 'method'
    }
  },
  getcontentsofurl: {
    name: 'Get Contents of URL',
    parameters: ['url', 'method', 'headers'],
    identifier: 'is.workflow.actions.getcontentsofurl',
    parameterMapping: {
      'WFURLActionURL': 'url',
      'WFHTTPMethodType': 'method'
    }
  },
  notification: {
    name: 'Notification',
    parameters: ['title', 'body', 'sound'],
    parameterMapping: {
      'WFNotificationActionTitle': 'title',
      'WFNotificationActionBody': 'body',
      'WFNotificationActionSound': 'sound'
    }
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