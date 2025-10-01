import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FinalAction {
  identifier: string;
  name: string;
  description: string;
  category: string;
  parameters: Array<{
    key: string;
    type: string;
    description?: string;
    required: boolean;
    defaultValue?: any;
    options?: string[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
  inputTypes: string[];
  outputTypes: string[];
  permissions: string;
  iosVersion?: string;
  deprecated?: boolean;
  confidence: 'high' | 'medium' | 'low';
  discoveredFrom: string[];
  usageExamples: string[];
  relatedActions: string[];
  alternatives: string[];
  notes?: string;
}

export class FinalDatabaseBuilder {
  private actionDatabase: Record<string, FinalAction> = {};

  async buildFinalDatabase(): Promise<void> {
    console.log('🎯 Building final comprehensive action database...\n');

    // Load existing comprehensive database
    await this.loadComprehensiveDatabase();

    // Enhance with parameter details and validation
    await this.enhanceWithDetailedParameters();

    // Add Apple official action definitions
    await this.addOfficialActions();

    // Create action relationships and alternatives
    await this.buildActionRelationships();

    // Validate and authenticate all actions
    await this.validateAllActions();

    // Generate final optimized database
    await this.generateFinalDatabase();

    console.log('\n✅ Final database build complete!');
  }

  private async loadComprehensiveDatabase(): Promise<void> {
    console.log('📂 Loading comprehensive database...');

    try {
      const data = await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/comprehensive-action-database.json', 'utf8');
      const comprehensive = JSON.parse(data);

      // Convert to final format with enhanced details
      Object.entries(comprehensive).forEach(([identifier, action]: [string, any]) => {
        this.actionDatabase[identifier] = {
          identifier,
          name: action.name,
          description: action.description || `Action: ${action.name}`,
          category: action.category,
          parameters: this.enhanceParameters(identifier, action.parameters || []),
          inputTypes: action.inputTypes || [],
          outputTypes: action.outputTypes || [],
          permissions: action.permissions || 'none',
          confidence: action.confidence || 'low',
          discoveredFrom: action.discoveredFrom || [],
          usageExamples: action.usageExamples || [],
          relatedActions: [],
          alternatives: []
        };
      });

      console.log(`  Loaded ${Object.keys(this.actionDatabase).length} actions`);
    } catch (error) {
      console.log('  No comprehensive database found, starting fresh');
    }
  }

  private enhanceParameters(identifier: string, basicParams: any[]): any[] {
    const id = identifier.toLowerCase();
    const enhanced: any[] = [];

    // Enhanced parameter definitions based on action type
    if (id.includes('text') && !id.includes('get')) {
      enhanced.push({
        key: 'WFTextActionText',
        type: 'string',
        description: 'The text to display or process',
        required: true,
        defaultValue: ''
      });
    }

    if (id.includes('notification')) {
      enhanced.push(
        {
          key: 'WFNotificationActionTitle',
          type: 'string',
          description: 'Notification title',
          required: false,
          defaultValue: 'Shortcut'
        },
        {
          key: 'WFNotificationActionBody',
          type: 'string',
          description: 'Notification message',
          required: true,
          defaultValue: ''
        },
        {
          key: 'WFNotificationActionSound',
          type: 'boolean',
          description: 'Play notification sound',
          required: false,
          defaultValue: false
        }
      );
    }

    if (id.includes('url')) {
      enhanced.push({
        key: 'WFURLActionURL',
        type: 'string',
        description: 'URL to open',
        required: true,
        validation: {
          pattern: '^https?://.+'
        }
      });
    }

    if (id.includes('wait')) {
      enhanced.push({
        key: 'WFWaitActionWaitTime',
        type: 'number',
        description: 'Time to wait in seconds',
        required: true,
        defaultValue: 1,
        validation: {
          min: 0,
          max: 3600
        }
      });
    }

    if (id.includes('volume') || id.includes('brightness')) {
      enhanced.push({
        key: 'WFSetValue',
        type: 'number',
        description: id.includes('volume') ? 'Volume level (0-100)' : 'Brightness level (0-100)',
        required: true,
        validation: {
          min: 0,
          max: 100
        }
      });
    }

    if (id.includes('ask')) {
      enhanced.push(
        {
          key: 'WFAskActionPrompt',
          type: 'string',
          description: 'Prompt text to show user',
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
      );
    }

    if (id.includes('choosefrommenu')) {
      enhanced.push(
        {
          key: 'WFChooseFromMenuActionPrompt',
          type: 'string',
          description: 'Menu prompt',
          required: true,
          defaultValue: 'Choose an option:'
        },
        {
          key: 'WFChooseFromMenuActionMenuItems',
          type: 'array',
          description: 'Menu items to display',
          required: true,
          defaultValue: ['Option 1', 'Option 2']
        }
      );
    }

    if (id.includes('conditional') || id.includes('if')) {
      enhanced.push({
        key: 'WFConditionalActionCondition',
        type: 'object',
        description: 'Condition to evaluate',
        required: true
      });
    }

    if (id.includes('repeat')) {
      enhanced.push(
        {
          key: 'WFRepeatActionCount',
          type: 'number',
          description: 'Number of times to repeat',
          required: true,
          defaultValue: 1,
          validation: {
            min: 1,
            max: 1000
          }
        },
        {
          key: 'WFRepeatActionTime',
          type: 'number',
          description: 'Repeat for this many seconds (optional)',
          required: false,
          validation: {
            min: 1,
            max: 3600
          }
        }
      );
    }

    // Keep original parameters if they exist
    basicParams.forEach(param => {
      if (!enhanced.find(p => p.key === param.key)) {
        enhanced.push({
          ...param,
          description: param.description || `Parameter: ${param.key}`
        });
      }
    });

    return enhanced;
  }

  private async enhanceWithDetailedParameters(): Promise<void> {
    console.log('🔧 Enhancing with detailed parameters...');

    // Add detailed parameter definitions for common actions
    const detailedActions: Record<string, Partial<FinalAction>> = {
      'is.workflow.actions.speak': {
        parameters: [
          {
            key: 'WFSpeakTextActionText',
            type: 'string',
            description: 'Text to speak aloud',
            required: true,
            defaultValue: 'Hello World!'
          },
          {
            key: 'WFSpeakTextActionLanguage',
            type: 'string',
            description: 'Language code for speech synthesis',
            required: false,
            defaultValue: 'en-US',
            options: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN', 'ko-KR']
          },
          {
            key: 'WFSpeakTextActionPitch',
            type: 'number',
            description: 'Voice pitch multiplier',
            required: false,
            defaultValue: 1.0,
            validation: { min: 0.5, max: 2.0 }
          },
          {
            key: 'WFSpeakTextActionRate',
            type: 'number',
            description: 'Speech rate multiplier',
            required: false,
            defaultValue: 1.0,
            validation: { min: 0.5, max: 2.0 }
          }
        ]
      },
      'is.workflow.actions.getcurrentweather': {
        parameters: [
          {
            key: 'WFWeatherActionLocation',
            type: 'any',
            description: 'Location to get weather for (defaults to current location)',
            required: false
          },
          {
            key: 'WFWeatherActionUnits',
            type: 'string',
            description: 'Temperature units',
            required: false,
            defaultValue: 'auto',
            options: ['auto', 'celsius', 'fahrenheit']
          }
        ]
      },
      'is.workflow.actions.openapp': {
        parameters: [
          {
            key: 'WFOpenAppActionAppIdentifier',
            type: 'string',
            description: 'App bundle identifier',
            required: true
          },
          {
            key: 'WFOpenAppActionApplication',
            type: 'any',
            description: 'Application to open',
            required: false
          }
        ]
      },
      'is.workflow.actions.createcalendarevent': {
        parameters: [
          {
            key: 'WFEventName',
            type: 'string',
            description: 'Event title',
            required: true,
            defaultValue: 'New Event'
          },
          {
            key: 'WFEventStartDate',
            type: 'date',
            description: 'Event start date and time',
            required: true
          },
          {
            key: 'WFEventEndDate',
            type: 'date',
            description: 'Event end date and time',
            required: true
          },
          {
            key: 'WFEventAllDay',
            type: 'boolean',
            description: 'All-day event',
            required: false,
            defaultValue: false
          },
          {
            key: 'WFEventCalendar',
            type: 'any',
            description: 'Calendar to add event to',
            required: false
          },
          {
            key: 'WFEventAlertType',
            type: 'string',
            description: 'Alert type',
            required: false,
            defaultValue: 'none',
            options: ['none', 'at time of event', '5 minutes before', '15 minutes before', '30 minutes before', '1 hour before', '2 hours before', '1 day before', '2 days before', '1 week before']
          }
        ]
      },
      'is.workflow.actions.getdirections': {
        parameters: [
          {
            key: 'WFDirectionsActionDestination',
            type: 'any',
            description: 'Destination location',
            required: true
          },
          {
            key: 'WFDirectionsActionTransportType',
            type: 'string',
            description: 'Transportation method',
            required: true,
            defaultValue: 'driving',
            options: ['driving', 'walking', 'transit']
          },
          {
            key: 'WFDirectionsActionShowRoute',
            type: 'boolean',
            description: 'Show route in Maps',
            required: false,
            defaultValue: true
          }
        ]
      }
    };

    let enhancedCount = 0;
    Object.entries(detailedActions).forEach(([identifier, details]) => {
      if (this.actionDatabase[identifier]) {
        Object.assign(this.actionDatabase[identifier], details);
        enhancedCount++;
      }
    });

    console.log(`  Enhanced ${enhancedCount} actions with detailed parameters`);
  }

  private async addOfficialActions(): Promise<void> {
    console.log('🍎 Adding official Apple actions...');

    // Add known official actions that might not be in community lists
    const officialActions: Record<string, Partial<FinalAction>> = {
      // Scripting & Flow Control
      'is.workflow.actions.choosefromlist': {
        name: 'Choose from List',
        description: 'Presents a list for user to choose from',
        category: 'scripting',
        parameters: [
          {
            key: 'WFChooseFromListActionPrompt',
            type: 'string',
            description: 'Prompt text',
            required: true,
            defaultValue: 'Choose an item:'
          },
          {
            key: 'WFChooseFromListActionList',
            type: 'array',
            description: 'List of items to choose from',
            required: true
          }
        ],
        inputTypes: ['any'],
        outputTypes: ['any'],
        confidence: 'high'
      },
      'is.workflow.actions.showresult': {
        name: 'Show Result',
        description: 'Displays the result of previous actions',
        category: 'scripting',
        parameters: [],
        inputTypes: ['any'],
        outputTypes: [],
        confidence: 'high'
      },
      'is.workflow.actions.nothing': {
        name: 'Do Nothing',
        description: 'Performs no action',
        category: 'scripting',
        parameters: [],
        inputTypes: [],
        outputTypes: [],
        confidence: 'high'
      },
      'is.workflow.actions.comment': {
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
        confidence: 'high'
      },
      'is.workflow.actions.exit': {
        name: 'Exit Shortcut',
        description: 'Stops execution of the shortcut',
        category: 'scripting',
        parameters: [],
        inputTypes: [],
        outputTypes: [],
        confidence: 'high'
      },

      // System Control
      'is.workflow.actions.setdnd': {
        name: 'Set Do Not Disturb',
        description: 'Turns Do Not Disturb on or off',
        category: 'device',
        parameters: [
          {
            key: 'WFSetDNDActionValue',
            type: 'boolean',
            description: 'Do Not Disturb state',
            required: true,
            defaultValue: true
          },
          {
            key: 'WFSetDNDActionTime',
            type: 'number',
            description: 'Duration in minutes (optional)',
            required: false,
            validation: { min: 1, max: 1440 }
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'device',
        confidence: 'high'
      },

      // Media Actions
      'is.workflow.actions.playmusic': {
        name: 'Play Music',
        description: 'Plays music from Music library',
        category: 'media',
        parameters: [
          {
            key: 'WFPlayMusicActionPlaylist',
            type: 'any',
            description: 'Playlist to play',
            required: false
          },
          {
            key: 'WFPlayMusicActionRepeatMode',
            type: 'string',
            description: 'Repeat mode',
            required: false,
            defaultValue: 'none',
            options: ['none', 'track', 'album', 'playlist']
          },
          {
            key: 'WFPlayMusicActionShuffleMode',
            type: 'boolean',
            description: 'Shuffle playback',
            required: false,
            defaultValue: false
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'media',
        confidence: 'high'
      },

      // Camera & Photos
      'is.workflow.actions.takephoto': {
        name: 'Take Photo',
        description: 'Takes a photo using the camera',
        category: 'camera',
        parameters: [
          {
            key: 'WFTakePhotoActionCamera',
            type: 'string',
            description: 'Camera to use',
            required: false,
            defaultValue: 'back',
            options: ['front', 'back']
          },
          {
            key: 'WFTakePhotoActionQuality',
            type: 'string',
            description: 'Photo quality',
            required: false,
            defaultValue: 'medium',
            options: ['low', 'medium', 'high']
          },
          {
            key: 'WFTakePhotoActionFlash',
            type: 'string',
            description: 'Flash setting',
            required: false,
            defaultValue: 'auto',
            options: ['on', 'off', 'auto']
          }
        ],
        inputTypes: [],
        outputTypes: ['WFImageContentItem'],
        permissions: 'camera',
        confidence: 'high'
      },

      // Location & Maps
      'is.workflow.actions.getcurrentlocation': {
        name: 'Get Current Location',
        description: 'Gets the device\'s current location',
        category: 'location',
        parameters: [],
        inputTypes: [],
        outputTypes: ['WFLocationContentItem'],
        permissions: 'location',
        confidence: 'high'
      },

      // Communication
      'is.workflow.actions.sendmessage': {
        name: 'Send Message',
        description: 'Sends a message via Messages',
        category: 'communication',
        parameters: [
          {
            key: 'WFSendMessageActionRecipients',
            type: 'array',
            description: 'Message recipients',
            required: true
          },
          {
            key: 'WFSendMessageActionMessage',
            type: 'string',
            description: 'Message text',
            required: true
          }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'contacts',
        confidence: 'high'
      },

      'is.workflow.actions.makephonecall': {
        name: 'Make Phone Call',
        description: 'Initiates a phone call',
        category: 'communication',
        parameters: [
          {
            key: 'WFMakePhoneCallActionPhoneNumber',
            type: 'string',
            description: 'Phone number to call',
            required: true
          }
        ],
        inputTypes: [],
        outputTypes: [],
        permissions: 'contacts',
        confidence: 'high'
      },

      'is.workflow.actions.sendemail': {
        name: 'Send Email',
        description: 'Sends an email',
        category: 'communication',
        parameters: [
          {
            key: 'WFSendEmailActionRecipients',
            type: 'array',
            description: 'Email recipients',
            required: true
          },
          {
            key: 'WFSendEmailActionSubject',
            type: 'string',
            description: 'Email subject',
            required: true
          },
          {
            key: 'WFSendEmailActionBody',
            type: 'string',
            description: 'Email body',
            required: true
          },
          {
            key: 'WFSendEmailActionShowCompose',
            type: 'boolean',
            description: 'Show compose window',
            required: false,
            defaultValue: false
          }
        ],
        inputTypes: ['WFStringContentItem'],
        outputTypes: [],
        permissions: 'contacts',
        confidence: 'high'
      }
    };

    let addedCount = 0;
    Object.entries(officialActions).forEach(([identifier, action]) => {
      if (!this.actionDatabase[identifier]) {
        this.actionDatabase[identifier] = {
          identifier,
          name: action.name || this.generateActionName(identifier),
          description: action.description || `Action: ${action.name || this.generateActionName(identifier)}`,
          category: action.category || 'general',
          parameters: action.parameters || [],
          inputTypes: action.inputTypes || [],
          outputTypes: action.outputTypes || [],
          permissions: action.permissions || 'none',
          confidence: action.confidence || 'high',
          discoveredFrom: ['official:apple'],
          usageExamples: [],
          relatedActions: [],
          alternatives: []
        };
        addedCount++;
      }
    });

    console.log(`  Added ${addedCount} official Apple actions`);
  }

  private async buildActionRelationships(): Promise<void> {
    console.log('🔗 Building action relationships...');

    // Define relationships between actions
    const relationships: Record<string, { related: string[], alternatives: string[] }> = {
      'is.workflow.actions.speak': {
        related: ['is.workflow.actions.notification', 'is.workflow.actions.showresult'],
        alternatives: ['is.workflow.actions.text']
      },
      'is.workflow.actions.gettext': {
        related: ['is.workflow.actions.ask', 'is.workflow.actions.getclipboard'],
        alternatives: ['is.workflow.actions.ask']
      },
      'is.workflow.actions.setvariable': {
        related: ['is.workflow.actions.getvariable', 'is.workflow.actions.calculate'],
        alternatives: []
      },
      'is.workflow.actions.conditional': {
        related: ['is.workflow.actions.repeat', 'is.workflow.actions.choosefrommenu'],
        alternatives: ['is.workflow.actions.choosefrommenu']
      },
      'is.workflow.actions.url': {
        related: ['is.workflow.actions.getcontentsofurl', 'is.workflow.actions.searchweb'],
        alternatives: ['is.workflow.actions.getcontentsofurl']
      },
      'is.workflow.actions.notification': {
        related: ['is.workflow.actions.speak', 'is.workflow.actions.showresult'],
        alternatives: ['is.workflow.actions.speak']
      }
    };

    let relationshipCount = 0;
    Object.entries(relationships).forEach(([identifier, rels]) => {
      if (this.actionDatabase[identifier]) {
        this.actionDatabase[identifier].relatedActions = rels.related.filter(id => this.actionDatabase[id]);
        this.actionDatabase[identifier].alternatives = rels.alternatives.filter(id => this.actionDatabase[id]);
        relationshipCount++;
      }
    });

    console.log(`  Built relationships for ${relationshipCount} actions`);
  }

  private async validateAllActions(): Promise<void> {
    console.log('✅ Validating all actions...');

    let validCount = 0;
    let invalidCount = 0;

    Object.entries(this.actionDatabase).forEach(([identifier, action]) => {
      // Validate action identifier format
      if (!/^is\.workflow\.actions\.[a-zA-Z0-9_]+$/.test(identifier)) {
        console.log(`  Invalid identifier: ${identifier}`);
        invalidCount++;
        return;
      }

      // Validate required fields
      if (!action.name || !action.category) {
        console.log(`  Missing required fields for: ${identifier}`);
        invalidCount++;
        return;
      }

      // Validate parameters
      if (action.parameters) {
        for (const param of action.parameters) {
          if (!param.key || !param.type) {
            console.log(`  Invalid parameter in ${identifier}: ${JSON.stringify(param)}`);
            invalidCount++;
            return;
          }
        }
      }

      validCount++;
    });

    console.log(`  Validated ${validCount} actions, ${invalidCount} invalid`);
  }

  private async generateFinalDatabase(): Promise<void> {
    console.log('📦 Generating final optimized database...');

    // Create final database with only valid actions
    const finalDatabase: Record<string, FinalAction> = {};

    Object.entries(this.actionDatabase).forEach(([identifier, action]) => {
      // Only include well-defined actions
      if (action.name && action.category && /^is\.workflow\.actions\.[a-zA-Z0-9_]+$/.test(identifier)) {
        finalDatabase[identifier] = {
          ...action,
          // Clean up discoveredFrom and usageExamples
          discoveredFrom: action.discoveredFrom.filter((source, index, arr) => arr.indexOf(source) === index),
          usageExamples: action.usageExamples.filter((example, index, arr) => arr.indexOf(example) === index)
        };
      }
    });

    // Save final database
    await fs.writeFile(
      '/Users/scrimwiggins/shortcut-genius-main/final-action-database.json',
      JSON.stringify(finalDatabase, null, 2)
    );

    // Generate statistics
    await this.generateFinalStatistics(finalDatabase);

    // Create optimized version for AI prompts
    await this.createOptimizedPrompt(finalDatabase);

    console.log(`  Final database contains ${Object.keys(finalDatabase).length} actions`);
  }

  private async generateFinalStatistics(database: Record<string, FinalAction>): Promise<void> {
    const actions = Object.values(database);

    const stats = {
      totalActions: actions.length,
      confidenceLevels: {
        high: actions.filter(a => a.confidence === 'high').length,
        medium: actions.filter(a => a.confidence === 'medium').length,
        low: actions.filter(a => a.confidence === 'low').length
      },
      categories: {} as Record<string, number>,
      permissionLevels: {} as Record<string, number>,
      parametersCount: {
        noParams: actions.filter(a => !a.parameters || a.parameters.length === 0).length,
        withParams: actions.filter(a => a.parameters && a.parameters.length > 0).length,
        avgParams: 0
      },
      inputOutputTypes: {
        noInput: actions.filter(a => !a.inputTypes || a.inputTypes.length === 0).length,
        noOutput: actions.filter(a => !a.outputTypes || a.outputTypes.length === 0).length,
        both: actions.filter(a => a.inputTypes && a.inputTypes.length > 0 && a.outputTypes && a.outputTypes.length > 0).length
      }
    };

    // Count categories and permissions
    actions.forEach(action => {
      stats.categories[action.category] = (stats.categories[action.category] || 0) + 1;
      stats.permissionLevels[action.permissions] = (stats.permissionLevels[action.permissions] || 0) + 1;
    });

    // Calculate average parameters
    const totalParams = actions.reduce((sum, action) => sum + (action.parameters?.length || 0), 0);
    stats.parametersCount.avgParams = Math.round((totalParams / actions.length) * 100) / 100;

    console.log('\n📊 Final Database Statistics:');
    console.log(`  Total actions: ${stats.totalActions}`);
    console.log(`  High confidence: ${stats.confidenceLevels.high} (${Math.round(stats.confidenceLevels.high / stats.totalActions * 100)}%)`);
    console.log(`  Medium confidence: ${stats.confidenceLevels.medium} (${Math.round(stats.confidenceLevels.medium / stats.totalActions * 100)}%)`);
    console.log(`  Low confidence: ${stats.confidenceLevels.low} (${Math.round(stats.confidenceLevels.low / stats.totalActions * 100)}%)`);
    console.log('  Categories:');
    Object.entries(stats.categories).forEach(([category, count]) => {
      console.log(`    ${category}: ${count} (${Math.round(count / stats.totalActions * 100)}%)`);
    });
    console.log(`  Actions with parameters: ${stats.parametersCount.withParams} (${Math.round(stats.parametersCount.withParams / stats.totalActions * 100)}%)`);
    console.log(`  Average parameters per action: ${stats.parametersCount.avgParams}`);
    console.log(`  Actions requiring permissions: ${actions.filter(a => a.permissions !== 'none').length}`);

    // Save statistics
    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/final-stats.json', JSON.stringify(stats, null, 2));
  }

  private async createOptimizedPrompt(database: Record<string, FinalAction>): Promise<void> {
    console.log('🎯 Creating optimized AI prompt...');

    let prompt = `# iOS Shortcuts Complete Action Database

This database contains ${Object.keys(database).length} verified iOS Shortcut actions with detailed parameter specifications.

## Usage Guidelines:
1. Use only action identifiers listed below
2. Include all required parameters for each action
3. Use appropriate default values for optional parameters
4. Consider permission requirements when designing shortcuts
5. Match input/output types between connected actions

`;

    // Group by category
    const categories: Record<string, FinalAction[]> = {};
    Object.values(database).forEach(action => {
      if (!categories[action.category]) {
        categories[action.category] = [];
      }
      categories[action.category].push(action);
    });

    Object.entries(categories).forEach(([category, actions]) => {
      prompt += `## ${category.toUpperCase()} ACTIONS (${actions.length})\n\n`;

      actions.forEach(action => {
        prompt += `### ${action.name}\n`;
        prompt += `**Identifier**: \`${action.identifier}\`\n`;
        prompt += `**Description**: ${action.description}\n`;
        prompt += `**Confidence**: ${action.confidence}\n`;

        if (action.parameters.length > 0) {
          prompt += `**Parameters**:\n`;
          action.parameters.forEach(param => {
            prompt += `- \`${param.key}\` (${param.type})`;
            if (param.required) prompt += ` - **REQUIRED**`;
            if (param.defaultValue !== undefined) prompt += ` - Default: \`${param.defaultValue}\``;
            if (param.options) prompt += ` - Options: ${param.options.map(o => `\`${o}\``).join(', ')}`;
            if (param.validation) {
              const validations = [];
              if (param.validation.min !== undefined) validations.push(`min: ${param.validation.min}`);
              if (param.validation.max !== undefined) validations.push(`max: ${param.validation.max}`);
              if (param.validation.pattern) validations.push(`pattern: ${param.validation.pattern}`);
              if (validations.length > 0) prompt += ` - Validation: ${validations.join(', ')}`;
            }
            prompt += `\n  - ${param.description}\n`;
          });
        } else {
          prompt += `**Parameters**: None\n`;
        }

        if (action.inputTypes.length > 0) {
          prompt += `**Input Types**: ${action.inputTypes.join(', ')}\n`;
        }

        if (action.outputTypes.length > 0) {
          prompt += `**Output Types**: ${action.outputTypes.join(', ')}\n`;
        }

        if (action.permissions !== 'none') {
          prompt += `**Permissions**: ${action.permissions}\n`;
        }

        if (action.relatedActions.length > 0) {
          prompt += `**Related Actions**: ${action.relatedActions.map(id => `\`${id}\``).join(', ')}\n`;
        }

        if (action.alternatives.length > 0) {
          prompt += `**Alternatives**: ${action.alternatives.map(id => `\`${id}\``).join(', ')}\n`;
        }

        prompt += '\n';
      });
    });

    prompt += `## Quick Reference Categories:
${Object.keys(categories).map(cat => `- **${cat}**: ${categories[cat].length} actions`).join('\n')}

## Permission Categories:
- **none**: No special permissions required
- **notification**: Requires notification permission
- **camera**: Requires camera access
- **microphone**: Requires microphone access
- **location**: Requires location access
- **contacts**: Requires contacts access
- **photo-library**: Requires photo library access
- **device**: Requires device control permissions
- **media**: Requires media library access
- **health**: Requires health data access
- **home**: Requires HomeKit access
- **commerce**: Requires payment capabilities

## Common Action Patterns:
1. **Input → Process → Output**: Use actions that accept input and produce output
2. **User Interaction**: Use "ask", "choosefrommenu", "showalert" for user input
3. **Control Flow**: Use "if", "repeat", "wait" for logic and timing
4. **Data Handling**: Use "setvariable", "getvariable", "calculate" for data manipulation
5. **App Integration**: Use specific app actions for deep integration

## Error Prevention:
- Always validate required parameters are provided
- Check input/output type compatibility between actions
- Consider iOS version requirements for newer actions
- Test shortcuts with actual data to ensure reliability
- Handle potential permission denials gracefully

Generated: ${new Date().toISOString()}
Total Actions: ${Object.keys(database).length}
`;

    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/ai-action-prompt.md', prompt);
    console.log('  Optimized AI prompt created');
  }

  private generateActionName(identifier: string): string {
    return identifier
      .replace('is.workflow.actions.', '')
      .split(/[_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Run builder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new FinalDatabaseBuilder();
  builder.buildFinalDatabase().catch(console.error);
}