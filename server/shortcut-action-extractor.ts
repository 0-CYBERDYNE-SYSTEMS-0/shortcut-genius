import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ShortcutAction {
  identifier: string;
  name: string;
  description?: string;
  parameters: Parameter[];
  category: string;
  glyph?: {
    number: number;
    startColor: number;
  };
  inputTypes: string[];
  outputTypes: string[];
  permissions: string;
}

interface Parameter {
  key: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
}

interface ExtractedShortcut {
  name: string;
  actions: ExtractedAction[];
  metadata: {
    clientVersion: string;
    minimumClientVersion: number;
    icon?: {
      glyphNumber: number;
      startColor: number;
    };
  };
}

interface ExtractedAction {
  identifier: string;
  parameters: Record<string, any>;
}

export class ShortcutActionExtractor {
  private actionDatabase: Map<string, ShortcutAction> = new Map();

  constructor() {
    this.initializeBuiltInActions();
  }

  private initializeBuiltInActions() {
    // Core built-in actions with proper identifiers
    const builtInActions: ShortcutAction[] = [
      {
        identifier: 'is.workflow.actions.gettext',
        name: 'Text',
        description: 'Displays text on the screen',
        category: 'text',
        parameters: [
          {
            key: 'WFTextActionText',
            type: 'string',
            description: 'The text to display',
            required: true,
            defaultValue: 'Hello World!'
          }
        ],
        inputTypes: [],
        outputTypes: ['WFStringContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.notification',
        name: 'Show Notification',
        description: 'Displays a notification',
        category: 'notification',
        parameters: [
          {
            key: 'WFNotificationActionBody',
            type: 'string',
            description: 'Notification body text',
            required: true,
            defaultValue: 'Notification'
          },
          {
            key: 'WFNotificationActionTitle',
            type: 'string',
            description: 'Notification title',
            required: false,
            defaultValue: 'Shortcut'
          },
          {
            key: 'WFNotificationActionSound',
            type: 'boolean',
            description: 'Play sound',
            required: false,
            defaultValue: false
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'notification'
      },
      {
        identifier: 'is.workflow.actions.url',
        name: 'Open URL',
        description: 'Opens a URL in the default browser',
        category: 'web',
        parameters: [
          {
            key: 'WFURLActionURL',
            type: 'string',
            description: 'The URL to open',
            required: true,
            defaultValue: 'https://example.com'
          }
        ],
        inputTypes: ['WFURLContentItem'],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.wait',
        name: 'Wait',
        description: 'Waits for a specified duration',
        category: 'scripting',
        parameters: [
          {
            key: 'WFWaitActionWaitTime',
            type: 'number',
            description: 'Time to wait in seconds',
            required: true,
            defaultValue: 1
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.speak',
        name: 'Speak Text',
        description: 'Speaks text using text-to-speech',
        category: 'media',
        parameters: [
          {
            key: 'WFSpeakTextActionText',
            type: 'string',
            description: 'Text to speak',
            required: true,
            defaultValue: 'Hello World!'
          },
          {
            key: 'WFSpeakTextActionLanguage',
            type: 'string',
            description: 'Language code',
            required: false,
            defaultValue: 'en-US'
          },
          {
            key: 'WFSpeakTextActionPitch',
            type: 'number',
            description: 'Voice pitch (0.5-2.0)',
            required: false,
            defaultValue: 1.0
          },
          {
            key: 'WFSpeakTextActionRate',
            type: 'number',
            description: 'Speech rate (0.5-2.0)',
            required: false,
            defaultValue: 1.0
          }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'media'
      },
      {
        identifier: 'is.workflow.actions.copy',
        name: 'Copy to Clipboard',
        description: 'Copies content to the clipboard',
        category: 'clipboard',
        parameters: [
          {
            key: 'WFCopyActionCopyText',
            type: 'any',
            description: 'Content to copy',
            required: true
          }
        ],
        inputTypes: ['WFStringContentItem', 'WFURLContentItem', 'WFImageContentItem'],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.setvariable',
        name: 'Set Variable',
        description: 'Sets a variable to a value',
        category: 'scripting',
        parameters: [
          {
            key: 'WFVariableName',
            type: 'string',
            description: 'Variable name',
            required: true,
            defaultValue: 'Variable'
          },
          {
            key: 'WFVariableInput',
            type: 'any',
            description: 'Variable value',
            required: true
          }
        ],
        inputTypes: ['any'],
        outputTypes: ['any'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.getvariable',
        name: 'Get Variable',
        description: 'Gets the value of a variable',
        category: 'scripting',
        parameters: [
          {
            key: 'WFVariableName',
            type: 'string',
            description: 'Variable name',
            required: true,
            defaultValue: 'Variable'
          }
        ],
        inputTypes: [],
        outputTypes: ['any'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.conditional',
        name: 'If',
        description: 'Performs actions conditionally',
        category: 'scripting',
        parameters: [
          {
            key: 'WFConditionalActionCondition',
            type: 'object',
            description: 'Condition to evaluate',
            required: true
          }
        ],
        inputTypes: ['any'],
        outputTypes: ['any'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.repeat',
        name: 'Repeat',
        description: 'Repeats actions multiple times',
        category: 'scripting',
        parameters: [
          {
            key: 'WFRepeatActionCount',
            type: 'number',
            description: 'Number of times to repeat',
            required: true,
            defaultValue: 1
          }
        ],
        inputTypes: ['any'],
        outputTypes: ['any'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.ask',
        name: 'Ask for Input',
        description: 'Asks the user for input',
        category: 'scripting',
        parameters: [
          {
            key: 'WFAskActionPrompt',
            type: 'string',
            description: 'Prompt text',
            required: true,
            defaultValue: 'Enter input:'
          },
          {
            key: 'WFAskActionDefaultAnswer',
            type: 'string',
            description: 'Default answer',
            required: false,
            defaultValue: ''
          }
        ],
        inputTypes: [],
        outputTypes: ['WFStringContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.showresult',
        name: 'Show Result',
        description: 'Shows the result of previous actions',
        category: 'scripting',
        parameters: [],
        inputTypes: ['any'],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.comment',
        name: 'Comment',
        description: 'Adds a comment to the shortcut',
        category: 'scripting',
        parameters: [
          {
            key: 'WFCommentActionText',
            type: 'string',
            description: 'Comment text',
            required: true,
            defaultValue: 'Comment'
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.exit',
        name: 'Exit Shortcut',
        description: 'Exits the shortcut immediately',
        category: 'scripting',
        parameters: [],
        inputTypes: [],
        outputTypes: [],
        permissions: 'none'
      }
    ];

    builtInActions.forEach(action => {
      this.actionDatabase.set(action.identifier, action);
    });
  }

  async extractActionsFromShortcut(shortcutPath: string): Promise<ExtractedShortcut> {
    try {
      // Convert signed shortcut to unsigned if needed
      const isSigned = await this.isShortcutSigned(shortcutPath);
      let plistPath = shortcutPath;

      if (isSigned) {
        plistPath = await this.convertToUnsigned(shortcutPath);
      }

      // Read and parse plist
      const plistContent = await fs.readFile(plistPath, 'utf8');
      const shortcutData = this.parsePlist(plistContent);

      const actions: ExtractedAction[] = [];
      const workflowActions = shortcutData.WFWorkflowActions || [];

      for (const action of workflowActions) {
        actions.push({
          identifier: action.WFWorkflowActionIdentifier,
          parameters: action.WFWorkflowActionParameters || {}
        });
      }

      return {
        name: shortcutData.WFWorkflowName || 'Unknown',
        actions,
        metadata: {
          clientVersion: shortcutData.WFWorkflowClientRelease || '2.2.2',
          minimumClientVersion: shortcutData.WFWorkflowMinimumClientVersion || 900,
          icon: shortcutData.WFWorkflowIcon
        }
      };
    } catch (error) {
      console.error(`Error extracting actions from ${shortcutPath}:`, error);
      throw error;
    }
  }

  private async isShortcutSigned(shortcutPath: string): Promise<boolean> {
    try {
      const result = await execAsync(`file "${shortcutPath}"`);
      return result.stdout.includes('data') || !result.stdout.includes('XML');
    } catch {
      return false;
    }
  }

  private async convertToUnsigned(signedPath: string): Promise<string> {
    const unsignedPath = signedPath.replace('.shortcut', '_unsigned.shortcut');
    try {
      // Try to extract plist from signed shortcut
      const result = await execAsync(`plutil -convert xml1 -o - "${signedPath}"`);
      await fs.writeFile(unsignedPath, result.stdout);
      return unsignedPath;
    } catch (plistError) {
      // If plutil fails, try to extract plist data manually
      await fs.writeFile(unsignedPath, plistError.stdout || '');
      return unsignedPath;
    }
  }

  private parsePlist(plistContent: string): any {
    try {
      // Simple plist parser for basic shortcuts
      // In production, use a proper plist parser
      const matches = plistContent.match(/<key>([^<]+)<\/key>\s*<string>([^<]+)<\/string>/g);
      const result: any = {};

      if (matches) {
        matches.forEach(match => {
          const [, key, value] = match.match(/<key>([^<]+)<\/key>\s*<string>([^<]+)<\/string>/) || [];
          result[key] = value;
        });
      }

      return result;
    } catch (error) {
      console.error('Error parsing plist:', error);
      return {};
    }
  }

  async buildActionDatabaseFromShortcuts(shortcutsDir: string): Promise<void> {
    try {
      const files = await fs.readdir(shortcutsDir);
      const shortcutFiles = files.filter(file => file.endsWith('.shortcut'));

      for (const file of shortcutFiles) {
        const shortcutPath = path.join(shortcutsDir, file);
        try {
          const extracted = await this.extractActionsFromShortcut(shortcutPath);

          for (const action of extracted.actions) {
            if (!this.actionDatabase.has(action.identifier)) {
              // Discover new action
              const newAction = await this.inferActionFromUsage(action, extracted);
              this.actionDatabase.set(action.identifier, newAction);
              console.log(`Discovered new action: ${newAction.name} (${action.identifier})`);
            }
          }
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
        }
      }

      console.log(`Built action database with ${this.actionDatabase.size} actions`);
    } catch (error) {
      console.error('Error building action database:', error);
    }
  }

  private async inferActionFromUsage(action: ExtractedAction, shortcut: ExtractedShortcut): Promise<ShortcutAction> {
    // Infer action details from usage patterns
    const parameterKeys = Object.keys(action.parameters);

    // Try to infer action type from identifier
    const actionType = this.inferActionTypeFromIdentifier(action.identifier);

    return {
      identifier: action.identifier,
      name: this.generateActionName(action.identifier),
      description: `Discovered action from shortcut: ${shortcut.name}`,
      category: actionType.category,
      parameters: parameterKeys.map(key => ({
        key,
        type: this.inferParameterType(action.parameters[key]),
        required: true,
        description: `Parameter: ${key}`
      })),
      inputTypes: actionType.inputTypes,
      outputTypes: actionType.outputTypes,
      permissions: actionType.permissions
    };
  }

  private inferActionTypeFromIdentifier(identifier: string): { category: string; inputTypes: string[]; outputTypes: string[]; permissions: string } {
    const id = identifier.toLowerCase();

    if (id.includes('text')) {
      return { category: 'text', inputTypes: [], outputTypes: ['WFStringContentItem'], permissions: 'none' };
    } else if (id.includes('notification')) {
      return { category: 'notification', inputTypes: [], outputTypes: [], permissions: 'notification' };
    } else if (id.includes('url')) {
      return { category: 'web', inputTypes: ['WFURLContentItem'], outputTypes: [], permissions: 'none' };
    } else if (id.includes('speak')) {
      return { category: 'media', inputTypes: ['WFStringContentItem'], outputTypes: [], permissions: 'media' };
    } else if (id.includes('copy')) {
      return { category: 'clipboard', inputTypes: ['any'], outputTypes: [], permissions: 'none' };
    } else if (id.includes('variable')) {
      return { category: 'scripting', inputTypes: ['any'], outputTypes: ['any'], permissions: 'none' };
    } else if (id.includes('conditional') || id.includes('if')) {
      return { category: 'scripting', inputTypes: ['any'], outputTypes: ['any'], permissions: 'none' };
    } else if (id.includes('repeat') || id.includes('loop')) {
      return { category: 'scripting', inputTypes: ['any'], outputTypes: ['any'], permissions: 'none' };
    } else if (id.includes('wait')) {
      return { category: 'scripting', inputTypes: [], outputTypes: [], permissions: 'none' };
    } else if (id.includes('ask')) {
      return { category: 'scripting', inputTypes: [], outputTypes: ['WFStringContentItem'], permissions: 'none' };
    } else if (id.includes('comment')) {
      return { category: 'scripting', inputTypes: [], outputTypes: [], permissions: 'none' };
    } else if (id.includes('exit')) {
      return { category: 'scripting', inputTypes: [], outputTypes: [], permissions: 'none' };
    } else {
      return { category: 'general', inputTypes: ['any'], outputTypes: ['any'], permissions: 'none' };
    }
  }

  private generateActionName(identifier: string): string {
    // Convert identifier to human-readable name
    return identifier
      .replace('is.workflow.actions.', '')
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private inferParameterType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'any';
  }

  getAction(identifier: string): ShortcutAction | undefined {
    return this.actionDatabase.get(identifier);
  }

  getAllActions(): ShortcutAction[] {
    return Array.from(this.actionDatabase.values());
  }

  getActionsByCategory(category: string): ShortcutAction[] {
    return this.getAllActions().filter(action => action.category === category);
  }

  async exportActionDatabase(outputPath: string): Promise<void> {
    const database = Object.fromEntries(this.actionDatabase);
    await fs.writeFile(outputPath, JSON.stringify(database, null, 2));
    console.log(`Action database exported to ${outputPath}`);
  }

  async importActionDatabase(inputPath: string): Promise<void> {
    try {
      const data = await fs.readFile(inputPath, 'utf8');
      const database = JSON.parse(data);
      this.actionDatabase = new Map(Object.entries(database));
      console.log(`Action database imported from ${inputPath}`);
    } catch (error) {
      console.error('Error importing action database:', error);
    }
  }

  generateActionDatabasePrompt(): string {
    const actions = this.getAllActions();
    let prompt = `iOS Shortcuts Action Database - Available Actions:\n\n`;

    const categories = [...new Set(actions.map(action => action.category))];

    for (const category of categories) {
      const categoryActions = actions.filter(action => action.category === category);
      prompt += `## ${category.toUpperCase()} Actions:\n\n`;

      for (const action of categoryActions) {
        prompt += `### ${action.name}\n`;
        prompt += `- **Identifier**: \`${action.identifier}\`\n`;
        prompt += `- **Description**: ${action.description}\n`;

        if (action.parameters.length > 0) {
          prompt += `- **Parameters**:\n`;
          for (const param of action.parameters) {
            prompt += `  - \`${param.key}\` (${param.type})`;
            if (param.required) prompt += ` (required)`;
            if (param.defaultValue !== undefined) prompt += ` - default: ${param.defaultValue}`;
            prompt += `\n`;
          }
        }

        if (action.inputTypes.length > 0) {
          prompt += `- **Input Types**: ${action.inputTypes.join(', ')}\n`;
        }

        if (action.outputTypes.length > 0) {
          prompt += `- **Output Types**: ${action.outputTypes.join(', ')}\n`;
        }

        prompt += `- **Permissions**: ${action.permissions}\n\n`;
      }
    }

    prompt += `## Guidelines for AI:\n`;
    prompt += `1. Use only the action identifiers listed above\n`;
    prompt += `2. Always include all required parameters\n`;
    prompt += `3. Use appropriate default values for optional parameters\n`;
    prompt += `4. Consider permission requirements (notification, media, etc.)\n`;
    prompt += `5. Use proper input/output type matching\n`;

    return prompt;
  }
}