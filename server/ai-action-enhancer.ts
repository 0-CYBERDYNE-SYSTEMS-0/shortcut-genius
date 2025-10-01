import { ShortcutActionExtractor } from './shortcut-action-extractor';
import { GlyphMappingSystem } from './glyph-mapping-system';
import { WebSearchTool } from './web-search-tool';
import fs from 'fs/promises';
import path from 'path';

interface EnhancedShortcutRequest {
  prompt: string;
  model: string;
  mode: 'generate' | 'analyze' | 'optimize';
  options?: {
    reasoning?: any;
    searchEnabled?: boolean;
    includeWeb?: boolean;
    maxActions?: number;
  };
}

interface ActionSuggestion {
  identifier: string;
  name: string;
  confidence: number;
  reason: string;
  parameters: ParameterSuggestion[];
  alternatives: string[];
}

interface ParameterSuggestion {
  key: string;
  value: any;
  confidence: number;
  reason: string;
  options?: string[];
}

interface EnhancedShortcutResponse {
  actions: EnhancedAction[];
  metadata: {
    totalConfidence: number;
    actionCount: number;
    categories: string[];
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    icon: {
      glyph: number;
      startColor: number;
      confidence: 'high' | 'medium' | 'low';
    };
    warnings: string[];
    suggestions: string[];
  };
}

interface EnhancedAction {
  identifier: string;
  name: string;
  parameters: Record<string, any>;
  confidence: number;
  reason: string;
  alternatives: ActionSuggestion[];
  icon: {
    glyph: number;
    startColor: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

export class AIActionEnhancer {
  private extractor: ShortcutActionExtractor;
  private glyphSystem: GlyphMappingSystem;
  private webSearch: WebSearchTool;
  private actionDatabasePath: string;

  constructor(actionDatabasePath?: string) {
    this.extractor = new ShortcutActionExtractor();
    this.glyphSystem = new GlyphMappingSystem();
    this.webSearch = new WebSearchTool();
    this.actionDatabasePath = actionDatabasePath || path.join(process.cwd(), 'action-database.json');
  }

  async initialize(): Promise<void> {
    try {
      // Load existing action database if available
      await this.extractor.importActionDatabase(this.actionDatabasePath);
      console.log(`Loaded action database with ${this.extractor.getAllActions().length} actions`);
    } catch (error) {
      console.log('No existing action database found, starting with built-in actions');
    }
  }

  async enhanceShortcutRequest(request: EnhancedShortcutRequest): Promise<EnhancedShortcutResponse> {
    console.log(`🤖 Enhancing shortcut request: "${request.prompt}"`);

    // Step 1: Analyze the prompt to understand requirements
    const analysis = await this.analyzePrompt(request.prompt);

    // Step 2: Generate action suggestions
    const actionSuggestions = await this.generateActionSuggestions(analysis, request.options);

    // Step 3: Build enhanced shortcut with metadata
    const enhancedShortcut = this.buildEnhancedShortcut(actionSuggestions);

    // Step 4: Generate metadata and warnings
    const metadata = await this.generateMetadata(enhancedShortcut, analysis);

    return {
      actions: enhancedShortcut,
      metadata
    };
  }

  private async analyzePrompt(prompt: string): Promise<{
    intent: string;
    entities: string[];
    complexity: 'simple' | 'moderate' | 'complex';
    requiredActions: string[];
    optionalActions: string[];
    webSearchNeeded: boolean;
  }> {
    const intent = this.extractIntent(prompt);
    const entities = this.extractEntities(prompt);
    const complexity = this.assessComplexity(prompt);
    const requiredActions = this.identifyRequiredActions(prompt);
    const optionalActions = this.identifyOptionalActions(prompt);
    const webSearchNeeded = this.needsWebSearch(prompt);

    return {
      intent,
      entities,
      complexity,
      requiredActions,
      optionalActions,
      webSearchNeeded
    };
  }

  private extractIntent(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('hello world') || lowerPrompt.includes('test')) {
      return 'testing';
    } else if (lowerPrompt.includes('weather')) {
      return 'weather_information';
    } else if (lowerPrompt.includes('message') || lowerPrompt.includes('text') || lowerPrompt.includes('sms')) {
      return 'communication';
    } else if (lowerPrompt.includes('location') || lowerPrompt.includes('map')) {
      return 'location';
    } else if (lowerPrompt.includes('music') || lowerPrompt.includes('play')) {
      return 'media';
    } else if (lowerPrompt.includes('note') || lowerPrompt.includes('reminder')) {
      return 'productivity';
    } else if (lowerPrompt.includes('photo') || lowerPrompt.includes('camera')) {
      return 'photography';
    } else if (lowerPrompt.includes('setting') || lowerPrompt.includes('brightness') || lowerPrompt.includes('wifi')) {
      return 'device_control';
    } else if (lowerPrompt.includes('time') || lowerPrompt.includes('date') || lowerPrompt.includes('wait')) {
      return 'timing';
    } else if (lowerPrompt.includes('calculate') || lowerPrompt.includes('math')) {
      return 'calculation';
    } else if (lowerPrompt.includes('web') || lowerPrompt.includes('search') || lowerPrompt.includes('browse')) {
      return 'web';
    } else {
      return 'general';
    }
  }

  private extractEntities(prompt: string): string[] {
    const entities: string[] = [];

    // Extract numbers
    const numbers = prompt.match(/\d+/g);
    if (numbers) entities.push(...numbers);

    // Extract times
    const times = prompt.match(/\d+:\d+/g);
    if (times) entities.push(...times);

    // Extract URLs
    const urls = prompt.match(/https?:\/\/[^\s]+/g);
    if (urls) entities.push(...urls);

    // Extract app names
    const apps = ['messages', 'safari', 'mail', 'notes', 'calendar', 'music', 'maps'];
    apps.forEach(app => {
      if (prompt.toLowerCase().includes(app)) {
        entities.push(app);
      }
    });

    return entities;
  }

  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    const lowerPrompt = prompt.toLowerCase();
    const wordCount = prompt.split(/\s+/).length;

    // Check for complex indicators
    const complexIndicators = [
      'if', 'then', 'else', 'conditional', 'repeat', 'loop', 'variable',
      'calculate', 'multiple', 'several', 'sequence', 'workflow'
    ];

    const hasComplexIndicators = complexIndicators.some(indicator => lowerPrompt.includes(indicator));

    if (hasComplexIndicators || wordCount > 20) {
      return 'complex';
    } else if (wordCount > 10 || lowerPrompt.includes('and') || lowerPrompt.includes('then')) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  private identifyRequiredActions(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    const actions: string[] = [];

    if (lowerPrompt.includes('hello world') || lowerPrompt.includes('text') || lowerPrompt.includes('display')) {
      actions.push('is.workflow.actions.gettext');
    }

    if (lowerPrompt.includes('notification') || lowerPrompt.includes('alert') || lowerPrompt.includes('notify')) {
      actions.push('is.workflow.actions.notification');
    }

    if (lowerPrompt.includes('weather')) {
      actions.push('is.workflow.actions.getcurrentweather');
    }

    if (lowerPrompt.includes('location') || lowerPrompt.includes('map')) {
      actions.push('is.workflow.actions.getcurrentlocation');
    }

    if (lowerPrompt.includes('music') || lowerPrompt.includes('play')) {
      actions.push('is.workflow.actions.playmusic');
    }

    if (lowerPrompt.includes('note')) {
      actions.push('is.workflow.actions.createnote');
    }

    if (lowerPrompt.includes('photo')) {
      actions.push('is.workflow.actions.takephoto');
    }

    if (lowerPrompt.includes('message') || lowerPrompt.includes('text') || lowerPrompt.includes('sms')) {
      actions.push('is.workflow.actions.sendmessage');
    }

    if (lowerPrompt.includes('email') || lowerPrompt.includes('mail')) {
      actions.push('is.workflow.actions.sendemail');
    }

    if (lowerPrompt.includes('phone') || lowerPrompt.includes('call')) {
      actions.push('is.workflow.actions.makephonecall');
    }

    if (lowerPrompt.includes('url') || lowerPrompt.includes('open') || lowerPrompt.includes('browse')) {
      actions.push('is.workflow.actions.url');
    }

    if (lowerPrompt.includes('wait') || lowerPrompt.includes('delay')) {
      actions.push('is.workflow.actions.wait');
    }

    if (lowerPrompt.includes('speak') || lowerPrompt.includes('say')) {
      actions.push('is.workflow.actions.speak');
    }

    return actions;
  }

  private identifyOptionalActions(prompt: string): string[] {
    const actions: string[] = [];

    // Optional actions that might be helpful
    actions.push('is.workflow.actions.setvariable'); // For storing intermediate results
    actions.push('is.workflow.actions.getvariable'); // For retrieving stored values
    actions.push('is.workflow.actions.showresult'); // For showing final results
    actions.push('is.workflow.actions.copy'); // For copying results to clipboard

    return actions;
  }

  private needsWebSearch(prompt: string): boolean {
    const webSearchIndicators = [
      'search', 'find', 'lookup', 'get information about', 'what is',
      'latest', 'current', 'news', 'weather', 'price', 'update'
    ];

    return webSearchIndicators.some(indicator => prompt.toLowerCase().includes(indicator));
  }

  private async generateActionSuggestions(analysis: any, options?: any): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [];

    // Start with required actions
    for (const actionIdentifier of analysis.requiredActions) {
      const action = this.extractor.getAction(actionIdentifier);
      if (action) {
        suggestions.push({
          identifier: action.identifier,
          name: action.name,
          confidence: 0.9,
          reason: `Required action for ${analysis.intent}`,
          parameters: this.generateParameterSuggestions(action, analysis.entities),
          alternatives: this.findAlternativeActions(action)
        });
      }
    }

    // Add context-aware optional actions
    const optionalActions = this.getContextualOptionalActions(analysis);
    for (const actionIdentifier of optionalActions) {
      const action = this.extractor.getAction(actionIdentifier);
      if (action) {
        suggestions.push({
          identifier: action.identifier,
          name: action.name,
          confidence: 0.6,
          reason: `Optional action for enhanced ${analysis.intent}`,
          parameters: this.generateParameterSuggestions(action, analysis.entities),
          alternatives: this.findAlternativeActions(action)
        });
      }
    }

    // If web search is needed, add it
    if (analysis.webSearchNeeded && options?.searchEnabled) {
      const webSearchAction = this.extractor.getAction('is.workflow.actions.getcontentsofurl');
      if (webSearchAction) {
        suggestions.push({
          identifier: 'is.workflow.actions.getcontentsofurl',
          name: 'Get Contents of URL',
          confidence: 0.8,
          reason: 'Web search needed for current information',
          parameters: [{
            key: 'URL',
            value: 'https://api.example.com/search',
            confidence: 0.7,
            reason: 'Placeholder URL, should be configured based on search needs'
          }],
          alternatives: ['is.workflow.actions.searchweb']
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private generateParameterSuggestions(action: any, entities: string[]): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];

    for (const param of action.parameters) {
      let value: any = param.defaultValue;
      let confidence = 0.7;
      let reason = 'Default value used';

      // Try to infer value from entities
      const matchingEntity = entities.find(entity => {
        if (param.type === 'number' && !isNaN(Number(entity))) return true;
        if (param.type === 'string' && entity.match(/^[a-zA-Z\s]+$/)) return true;
        if (param.type === 'string' && entity.match(/^https?:\/\//)) return true;
        return false;
      });

      if (matchingEntity) {
        value = param.type === 'number' ? Number(matchingEntity) : matchingEntity;
        confidence = 0.9;
        reason = `Inferred from user input: ${matchingEntity}`;
      }

      // Special parameter handling
      if (param.key === 'WFTextActionText' && !value) {
        value = 'Hello World!';
        reason = 'Default text content';
      } else if (param.key === 'WFNotificationActionTitle' && !value) {
        value = 'Notification';
        reason = 'Default notification title';
      } else if (param.key === 'WFNotificationActionBody' && !value) {
        value = 'This is a notification from your shortcut';
        reason = 'Default notification body';
      } else if (param.key === 'WFURLActionURL' && !value) {
        value = 'https://example.com';
        reason = 'Default URL';
      } else if (param.key === 'WFWaitActionWaitTime' && !value) {
        value = 1;
        reason = 'Default wait time: 1 second';
      }

      suggestions.push({
        key: param.key,
        value,
        confidence,
        reason
      });
    }

    return suggestions;
  }

  private findAlternativeActions(action: any): string[] {
    // Find similar actions in the same category
    const sameCategoryActions = this.extractor.getActionsByCategory(action.category);
    return sameCategoryActions
      .filter(a => a.identifier !== action.identifier)
      .map(a => a.identifier)
      .slice(0, 3); // Top 3 alternatives
  }

  private getContextualOptionalActions(analysis: any): string[] {
    const optionalActions: string[] = [];

    // Add show result for most shortcuts
    optionalActions.push('is.workflow.actions.showresult');

    // Add variable management for complex workflows
    if (analysis.complexity === 'complex') {
      optionalActions.push('is.workflow.actions.setvariable');
      optionalActions.push('is.workflow.actions.getvariable');
    }

    // Add copy to clipboard for results
    if (analysis.intent === 'information' || analysis.intent === 'web') {
      optionalActions.push('is.workflow.actions.copy');
    }

    // Add wait for timing-related workflows
    if (analysis.intent === 'timing') {
      optionalActions.push('is.workflow.actions.wait');
    }

    return optionalActions;
  }

  private buildEnhancedShortcut(actionSuggestions: ActionSuggestion[]): EnhancedAction[] {
    return actionSuggestions.map(suggestion => {
      const iconSuggestion = this.glyphSystem.generateIconSuggestion(suggestion.identifier, suggestion.name);

      return {
        identifier: suggestion.identifier,
        name: suggestion.name,
        parameters: Object.fromEntries(
          suggestion.parameters.map(p => [p.key, p.value])
        ),
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        alternatives: suggestion.alternatives.map(alt => ({
          identifier: alt,
          name: this.extractor.getAction(alt)?.name || alt,
          confidence: 0.5,
          reason: 'Alternative action',
          parameters: [],
          alternatives: []
        })),
        icon: {
          glyph: iconSuggestion.glyph,
          startColor: this.glyphSystem.suggestColorForGlyph(iconSuggestion.glyph),
          confidence: iconSuggestion.confidence
        }
      };
    });
  }

  private async generateMetadata(enhancedShortcut: EnhancedAction[], analysis: any): Promise<any> {
    const categories = [...new Set(enhancedShortcut.map(enhancedAction => {
      const action = this.extractor.getAction(enhancedAction.identifier);
      return action?.category || 'unknown';
    }))];

    const totalConfidence = enhancedShortcut.reduce((sum, action) => sum + action.confidence, 0) / enhancedShortcut.length;
    const warnings = this.generateWarnings(enhancedShortcut, analysis);
    const suggestions = this.generateSuggestions(enhancedShortcut, analysis);

    // Determine best icon for the overall shortcut
    const bestAction = enhancedShortcut.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return {
      totalConfidence,
      actionCount: enhancedShortcut.length,
      categories,
      estimatedComplexity: analysis.complexity,
      icon: bestAction.icon,
      warnings,
      suggestions
    };
  }

  private generateWarnings(enhancedShortcut: EnhancedAction[], analysis: any): string[] {
    const warnings: string[] = [];

    // Check for low confidence actions
    const lowConfidenceActions = enhancedShortcut.filter(action => action.confidence < 0.7);
    if (lowConfidenceActions.length > 0) {
      warnings.push(`${lowConfidenceActions.length} actions have low confidence and may not work as expected`);
    }

    // Check for permission requirements
    const permissionCategories = enhancedShortcut.map(action => {
      const actionData = this.extractor.getAction(action.identifier);
      return actionData?.permissions;
    }).filter(Boolean);

    const uniquePermissions = [...new Set(permissionCategories)];
    const specialPermissions = uniquePermissions.filter(p => p !== 'none');
    if (specialPermissions.length > 0) {
      warnings.push(`Shortcut requires special permissions: ${specialPermissions.join(', ')}`);
    }

    // Check for complexity warnings
    if (analysis.complexity === 'complex' && enhancedShortcut.length > 10) {
      warnings.push('Complex shortcut with many actions may be slow or difficult to debug');
    }

    return warnings;
  }

  private generateSuggestions(enhancedShortcut: EnhancedAction[], analysis: any): string[] {
    const suggestions: string[] = [];

    // Suggest adding result display if not present
    const hasShowResult = enhancedShortcut.some(action => action.identifier === 'is.workflow.actions.showresult');
    if (!hasShowResult && analysis.intent !== 'testing') {
      suggestions.push('Consider adding a "Show Result" action to display output to the user');
    }

    // Suggest error handling for complex workflows
    if (analysis.complexity === 'complex') {
      suggestions.push('Consider adding error handling and user feedback for complex workflows');
    }

    // Suggest variable usage for repeated data
    const repeatedData = this.findRepeatedData(enhancedShortcut);
    if (repeatedData.length > 0) {
      suggestions.push('Consider using variables to store and reuse repeated data');
    }

    // Suggest testing on device
    suggestions.push('Test the shortcut on your device to ensure all actions work as expected');

    return suggestions;
  }

  private findRepeatedData(enhancedShortcut: EnhancedAction[]): string[] {
    const values = enhancedShortcut.flatMap(action => Object.values(action.parameters));
    const valueCounts = new Map<string, number>();

    values.forEach(value => {
      const stringValue = String(value);
      valueCounts.set(stringValue, (valueCounts.get(stringValue) || 0) + 1);
    });

    return Array.from(valueCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value);
  }

  generateEnhancedPrompt(originalPrompt: string): string {
    const actionDatabase = this.extractor.generateActionDatabasePrompt();
    const glyphDatabase = this.glyphSystem.exportGlyphDatabase();

    return `
# Enhanced iOS Shortcuts Generation

You are an expert iOS Shortcuts developer with access to a comprehensive action database.

## Available Actions

${actionDatabase}

## Icon/Glyph System

Available glyphs for shortcut icons:
- Text actions: Use glyph 59511 (Text Bubble)
- Communication: Use glyphs 59512-59514 (Chat, Mail, Phone)
- Location: Use glyphs 59519-59521 (Location, Map, Direction)
- Web: Use glyphs 59522-59524 (Globe, Search, Download)
- Device: Use glyphs 59525-59528 (Settings, Battery, Wi-Fi, Bluetooth)
- Camera: Use glyphs 59529-59530 (Camera, Photo)
- Media: Use glyphs 59531-59532, 59515-59518 (Music, Video, Play/Pause/Stop/Record)
- Data: Use glyphs 59533-59536 (Calendar, Clock, Calculator, Weather)
- Scripting: Use glyphs 59537-59540 (Code, Logic, Loop, Variable)
- Files: Use glyphs 59541-59544 (Document, Folder, PDF, Archive)
- UI: Use glyphs 59545-59547, 59561-59564 (Alert, Question, Checkmark, Star, Flag, Tag, Bookmark)
- Utilities: Use glyphs 59549-59552 (Clipboard, Speaker, Microphone, Volume)
- Apps: Use glyphs 59553-59556 (App Store, Safari, Messages, Phone)
- System: Use glyphs 59557-59560, 59558 (Home, Lock, Power, Settings Advanced)

## Color Suggestions

- Blue (431817727): Text, UI, generic
- Green (4280286208): Communication, files
- Orange (4286833817): Web, apps
- Red (4281348876): Location, alerts
- Purple (4285513727): Device, media, data, scripting, utilities
- Pink (4287707776): Camera, media

## User Request

${originalPrompt}

## Requirements

1. Use ONLY action identifiers from the available actions list
2. Include proper glyph numbers and start colors for the shortcut icon
3. Structure your response as valid JSON with the following format:
   \`\`\`json
   {
     "name": "Shortcut Name",
     "actions": [
       {
         "type": "action_identifier",
         "parameters": {
           "parameter_key": "parameter_value"
         }
       }
     ],
     "icon": {
       "glyphNumber": 59511,
       "startColor": 431817727
     }
   }
   \`\`\`

4. Always use the correct action identifiers (e.g., "is.workflow.actions.gettext" for text actions)
5. Include all required parameters for each action
6. Choose appropriate glyphs and colors based on the action categories

Generate a functional iOS shortcut based on the user's request.
`.trim();
  }

  getActionDatabase(): any {
    return this.extractor['actionDatabase'] || {};
  }

  async exportEnhancedDatabase(outputPath: string): Promise<void> {
    const database = {
      actions: Object.fromEntries(this.extractor['actionDatabase']),
      glyphs: this.glyphSystem.exportGlyphDatabase(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.writeFile(outputPath, JSON.stringify(database, null, 2));
    console.log(`Enhanced action database exported to: ${outputPath}`);
  }
}