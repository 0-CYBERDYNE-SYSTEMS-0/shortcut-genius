import { ShortcutActionExtractor } from './shortcut-action-extractor';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface ActionDatabaseBuilder {
  extractor: ShortcutActionExtractor;
  shortcutsDir: string;
  outputPath: string;
}

export class ActionDatabaseBuilder {
  private extractor: ShortcutActionExtractor;
  private shortcutsDir: string;
  private outputPath: string;

  constructor(shortcutsDir: string = '/Users/scrimwiggins/shortcut-genius-main/shares', outputPath: string = '/Users/scrimwiggins/shortcut-genius-main/action-database.json') {
    this.extractor = new ShortcutActionExtractor();
    this.shortcutsDir = shortcutsDir;
    this.outputPath = outputPath;
  }

  async buildFromExistingShortcuts(): Promise<void> {
    console.log('🔍 Building action database from existing shortcuts...');

    try {
      // Step 1: Build from project shortcuts
      await this.extractor.buildActionDatabaseFromShortcuts(this.shortcutsDir);

      // Step 2: Extract from user's personal shortcuts
      await this.extractFromUserShortcuts();

      // Step 3: Extract from system shortcuts
      await this.extractFromSystemShortcuts();

      // Step 4: Add discovered actions from CLI
      await this.addDiscoveredActions();

      // Step 5: Export the database
      await this.extractor.exportActionDatabase(this.outputPath);

      console.log(`✅ Action database built with ${this.extractor.getAllActions().length} actions`);
      console.log(`📁 Database saved to: ${this.outputPath}`);

    } catch (error) {
      console.error('❌ Error building action database:', error);
      throw error;
    }
  }

  private async extractFromUserShortcuts(): Promise<void> {
    console.log('📱 Extracting from user shortcuts...');

    try {
      // Try to access user's shortcuts
      const result = await execAsync('shortcuts list');
      const shortcuts = result.stdout.trim().split('\n').filter(Boolean);

      console.log(`Found ${shortcuts.length} user shortcuts`);

      // Extract actions from a sample of user shortcuts
      const sampleSize = Math.min(10, shortcuts.length);
      const sampleShortcuts = shortcuts.slice(0, sampleSize);

      for (const shortcutName of sampleShortcuts) {
        try {
          await this.extractFromUserShortcut(shortcutName);
        } catch (error) {
          console.warn(`  ⚠️  Could not extract from "${shortcutName}": ${error.message}`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not access user shortcuts, skipping...');
    }
  }

  private async extractFromUserShortcut(shortcutName: string): Promise<void> {
    // Create a temporary file to export the shortcut
    const tempPath = `/tmp/${shortcutName.replace(/[^a-zA-Z0-9]/g, '_')}.shortcut`;

    try {
      // Try to export the shortcut
      await execAsync(`shortcuts view "${shortcutName}" > "${tempPath}" 2>/dev/null || true`);

      // Check if file was created
      try {
        await fs.access(tempPath);

        const extracted = await this.extractor.extractActionsFromShortcut(tempPath);

        for (const action of extracted.actions) {
          if (!this.extractor.getAction(action.identifier)) {
            const newAction = await this.extractor.inferActionFromUsage(action, extracted);
            this.extractor['actionDatabase'].set(action.identifier, newAction);
            console.log(`  ✨ Discovered from "${shortcutName}": ${newAction.name}`);
          }
        }

        // Clean up
        await fs.unlink(tempPath);
      } catch {
        // File wasn't created or couldn't be accessed
      }
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  private async extractFromSystemShortcuts(): Promise<void> {
    console.log('🖥️  Extracting from system shortcuts...');

    // Look for system shortcut definitions in known locations
    const systemPaths = [
      '/System/Library/PrivateFrameworks/WorkflowKit.framework',
      '/System/Library/CoreServices/ShortcutsActions.app',
      '/System/Applications/Shortcuts.app'
    ];

    for (const systemPath of systemPaths) {
      try {
        await this.extractFromSystemPath(systemPath);
      } catch (error) {
        console.warn(`  ⚠️  Could not extract from ${systemPath}: ${error.message}`);
      }
    }
  }

  private async extractFromSystemPath(systemPath: string): Promise<void> {
    try {
      // Check if path exists
      await fs.access(systemPath);

      // Look for plist files that might contain action definitions
      const files = await fs.readdir(systemPath, { recursive: true });
      const plistFiles = files.filter((file: string) =>
        typeof file === 'string' && file.endsWith('.plist')
      );

      for (const plistFile of plistFiles) {
        try {
          const fullPath = path.join(systemPath, plistFile);
          const content = await fs.readFile(fullPath, 'utf8');

          // Try to extract action identifiers from plist
          const actionMatches = content.match(/is\.workflow\.actions\.[a-zA-Z0-9_]+/g);

          if (actionMatches) {
            for (const match of new Set(actionMatches)) {
              if (!this.extractor.getAction(match)) {
                // Add placeholder action that can be updated later
                const placeholderAction = {
                  identifier: match,
                  name: this.extractor['generateActionName'](match),
                  description: `System action from ${plistFile}`,
                  category: 'system',
                  parameters: [],
                  inputTypes: [],
                  outputTypes: [],
                  permissions: 'none'
                };

                this.extractor['actionDatabase'].set(match, placeholderAction);
                console.log(`  🔍 Found system action: ${placeholderAction.name}`);
              }
            }
          }
        } catch (error) {
          // Continue with other files
        }
      }
    } catch (error) {
      throw error;
    }
  }

  private async addDiscoveredActions(): Promise<void> {
    console.log('🔬 Adding discovered actions from various sources...');

    // Add actions discovered from testing and documentation
    const discoveredActions = [
      {
        identifier: 'is.workflow.actions.showalert',
        name: 'Show Alert',
        description: 'Shows an alert dialog with options',
        category: 'scripting',
        parameters: [
          { key: 'WFAlertActionTitle', type: 'string', description: 'Alert title', required: true, defaultValue: 'Alert' },
          { key: 'WFAlertActionMessage', type: 'string', description: 'Alert message', required: true, defaultValue: 'Message' }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.choosefrommenu',
        name: 'Choose from Menu',
        description: 'Shows a menu of options for the user to choose from',
        category: 'scripting',
        parameters: [
          { key: 'WFChooseFromMenuActionPrompt', type: 'string', description: 'Menu prompt', required: true, defaultValue: 'Choose an option:' },
          { key: 'WFChooseFromMenuActionMenuItems', type: 'array', description: 'Menu items', required: true, defaultValue: ['Option 1', 'Option 2'] }
        ],
        inputTypes: [],
        outputTypes: ['WFStringContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.date',
        name: 'Date',
        description: 'Gets the current date or creates a date',
        category: 'data',
        parameters: [
          { key: 'WFDateActionDate', type: 'string', description: 'Date string', required: false, defaultValue: 'now' }
        ],
        inputTypes: [],
        outputTypes: ['WFDateContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.time',
        name: 'Time',
        description: 'Gets the current time or creates a time',
        category: 'data',
        parameters: [
          { key: 'WFTimeActionTime', type: 'string', description: 'Time string', required: false, defaultValue: 'now' }
        ],
        inputTypes: [],
        outputTypes: ['WFDateContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.math',
        name: 'Calculate',
        description: 'Performs mathematical calculations',
        category: 'data',
        parameters: [
          { key: 'WFCalculateActionOperand1', type: 'number', description: 'First operand', required: true },
          { key: 'WFCalculateActionOperand2', type: 'number', description: 'Second operand', required: true },
          { key: 'WFCalculateActionOperation', type: 'string', description: 'Operation (+, -, *, /)', required: true, defaultValue: '+' }
        ],
        inputTypes: ['number'],
        outputTypes: ['WFNumberContentItem'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.getclipboard',
        name: 'Get Clipboard',
        description: 'Gets content from the clipboard',
        category: 'clipboard',
        parameters: [],
        inputTypes: [],
        outputTypes: ['any'],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.getcurrentlocation',
        name: 'Get Current Location',
        description: 'Gets the device\'s current location',
        category: 'location',
        parameters: [],
        inputTypes: [],
        outputTypes: ['WFLocationContentItem'],
        permissions: 'location'
      },
      {
        identifier: 'is.workflow.actions.getcurrentweather',
        name: 'Get Current Weather',
        description: 'Gets current weather conditions',
        category: 'location',
        parameters: [],
        inputTypes: [],
        outputTypes: ['WFWeatherContentItem'],
        permissions: 'location'
      },
      {
        identifier: 'is.workflow.actions.openapp',
        name: 'Open App',
        description: 'Opens a specific app',
        category: 'apps',
        parameters: [
          { key: 'WFOpenAppActionAppIdentifier', type: 'string', description: 'App bundle identifier', required: true }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.playmusic',
        name: 'Play Music',
        description: 'Plays music from the music library',
        category: 'media',
        parameters: [
          { key: 'WFPlayMusicActionPlaylist', type: 'string', description: 'Playlist name', required: false }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'media'
      },
      {
        identifier: 'is.workflow.actions.createnote',
        name: 'Create Note',
        description: 'Creates a note in the Notes app',
        category: 'apps',
        parameters: [
          { key: 'WFNoteActionNote', type: 'string', description: 'Note content', required: true },
          { key: 'WFNoteActionTitle', type: 'string', description: 'Note title', required: false }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'none'
      },
      {
        identifier: 'is.workflow.actions.sendmessage',
        name: 'Send Message',
        description: 'Sends a message via Messages',
        category: 'apps',
        parameters: [
          { key: 'WFSendMessageActionRecipients', type: 'array', description: 'Recipients', required: true },
          { key: 'WFSendMessageActionMessage', type: 'string', description: 'Message text', required: true }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'contacts'
      },
      {
        identifier: 'is.workflow.actions.makephonecall',
        name: 'Make Phone Call',
        description: 'Makes a phone call',
        category: 'apps',
        parameters: [
          { key: 'WFMakePhoneCallActionPhoneNumber', type: 'string', description: 'Phone number', required: true }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'contacts'
      },
      {
        identifier: 'is.workflow.actions.sendemail',
        name: 'Send Email',
        description: 'Sends an email',
        category: 'apps',
        parameters: [
          { key: 'WFSendEmailActionRecipients', type: 'array', description: 'Recipients', required: true },
          { key: 'WFSendEmailActionSubject', type: 'string', description: 'Email subject', required: true },
          { key: 'WFSendEmailActionBody', type: 'string', description: 'Email body', required: true }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'contacts'
      },
      {
        identifier: 'is.workflow.actions.getwifi',
        name: 'Get Wi-Fi Networks',
        description: 'Gets available Wi-Fi networks',
        category: 'device',
        parameters: [],
        inputTypes: [],
        outputTypes: ['any'],
        permissions: 'device'
      },
      {
        identifier: 'is.workflow.actions.setwifi',
        name: 'Set Wi-Fi',
        description: 'Turns Wi-Fi on or off',
        category: 'device',
        parameters: [
          { key: 'WFSetWifiActionValue', type: 'boolean', description: 'Wi-Fi state', required: true, defaultValue: true }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'device'
      },
      {
        identifier: 'is.workflow.actions.setbrightness',
        name: 'Set Brightness',
        description: 'Sets the screen brightness',
        category: 'device',
        parameters: [
          { key: 'WFSetBrightnessActionValue', type: 'number', description: 'Brightness level (0-100)', required: true, defaultValue: 50 }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'device'
      },
      {
        identifier: 'is.workflow.actions.setdnd',
        name: 'Set Do Not Disturb',
        description: 'Sets Do Not Disturb mode',
        category: 'device',
        parameters: [
          { key: 'WFSetDNDActionValue', type: 'boolean', description: 'DND state', required: true, defaultValue: true }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'device'
      },
      {
        identifier: 'is.workflow.actions.takescreenshot',
        name: 'Take Screenshot',
        description: 'Takes a screenshot',
        category: 'device',
        parameters: [],
        inputTypes: [],
        outputTypes: ['WFImageContentItem'],
        permissions: 'device'
      },
      {
        identifier: 'is.workflow.actions.takephoto',
        name: 'Take Photo',
        description: 'Takes a photo with the camera',
        category: 'camera',
        parameters: [],
        inputTypes: [],
        outputTypes: ['WFImageContentItem'],
        permissions: 'camera'
      },
      {
        identifier: 'is.workflow.actions.selectphoto',
        name: 'Select Photos',
        description: 'Selects photos from the photo library',
        category: 'camera',
        parameters: [
          { key: 'WFSelectPhotosActionMaxCount', type: 'number', description: 'Maximum number of photos', required: false, defaultValue: 1 }
        ],
        inputTypes: [],
        outputTypes: ['WFImageContentItem'],
        permissions: 'photo-library'
      }
    ];

    for (const action of discoveredActions) {
      if (!this.extractor.getAction(action.identifier)) {
        this.extractor['actionDatabase'].set(action.identifier, action);
        console.log(`  ✨ Added discovered action: ${action.name}`);
      }
    }
  }

  async updateDatabase(): Promise<void> {
    console.log('🔄 Updating action database...');

    try {
      // Import existing database if it exists
      try {
        await this.extractor['importActionDatabase'](this.outputPath);
        console.log(`📂 Loaded existing database with ${this.extractor.getAllActions().length} actions`);
      } catch {
        console.log('📄 No existing database found, creating new one');
      }

      // Build from sources
      await this.buildFromExistingShortcuts();

      // Generate enhanced prompt for AI
      const prompt = this.extractor.generateActionDatabasePrompt();
      const promptPath = this.outputPath.replace('.json', '-prompt.txt');
      await fs.writeFile(promptPath, prompt);
      console.log(`📝 Enhanced AI prompt saved to: ${promptPath}`);

    } catch (error) {
      console.error('❌ Error updating database:', error);
      throw error;
    }
  }

  async getDatabaseStats(): Promise<{
    totalActions: number;
    categories: string[];
    actionsByCategory: Record<string, number>;
    sampleActions: string[];
  }> {
    const actions = this.extractor.getAllActions();
    const categories = [...new Set(actions.map(action => action.category))];
    const actionsByCategory: Record<string, number> = {};

    categories.forEach(category => {
      actionsByCategory[category] = actions.filter(action => action.category === category).length;
    });

    const sampleActions = actions.slice(0, 10).map(action => action.name);

    return {
      totalActions: actions.length,
      categories,
      actionsByCategory,
      sampleActions
    };
  }
}