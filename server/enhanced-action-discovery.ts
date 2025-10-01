import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface DiscoveredAction {
  identifier: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  exampleUsage?: string;
  sourceShortcut?: string;
}

interface ActionDatabase {
  [identifier: string]: {
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
    }>;
    inputTypes: string[];
    outputTypes: string[];
    permissions: string;
    confidence: 'high' | 'medium' | 'low';
    discoveredFrom: string[];
    usageExamples: string[];
  };
}

export class EnhancedActionDiscovery {
  private discoveredActions: Map<string, DiscoveredAction> = new Map();
  private actionDatabase: ActionDatabase = {};

  constructor() {
    this.actionDatabase = {};
  }

  private async loadExistingDatabase(): Promise<void> {
    try {
      const data = await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/action-database.json', 'utf8');
      const existingDatabase = JSON.parse(data);

      // Migrate existing actions to new format
      this.actionDatabase = {};
      Object.entries(existingDatabase).forEach(([identifier, action]: [string, any]) => {
        this.actionDatabase[identifier] = {
          ...action,
          confidence: 'medium', // Default confidence for existing actions
          discoveredFrom: ['original-database'],
          usageExamples: []
        };
      });

      console.log(`Loaded existing database with ${Object.keys(this.actionDatabase).length} actions`);
    } catch (error) {
      console.log('No existing database found, starting fresh');
      this.actionDatabase = {};
    }
  }

  async discoverAllActions(): Promise<void> {
    console.log('🚀 Starting enhanced action discovery...\n');

    // Load existing database first
    await this.loadExistingDatabase();

    // Phase 1: Fast binary extraction
    await this.extractFromSystemBinaries();

    // Phase 2: Framework mining
    await this.extractFromFrameworks();

    // Phase 3: Smart shortcut sampling
    await this.extractFromShortcutSample();

    // Phase 4: Cross-reference and validation
    await this.crossReferenceActions();

    // Phase 5: Build enhanced database
    await this.buildEnhancedDatabase();

    console.log('\n✅ Action discovery complete!');
  }

  private async extractFromSystemBinaries(): Promise<void> {
    console.log('📱 Extracting actions from system binaries...');

    const binaries = [
      '/System/Applications/Shortcuts.app/Contents/MacOS/Shortcuts',
      '/System/Applications/Shortcuts.app/Contents/PlugIns/ShortcutsActionExtension.appex/Contents/MacOS/ShortcutsActionExtension',
      '/System/Library/CoreServices/ShortcutsActions.app/Contents/MacOS/ShortcutsActions'
    ];

    for (const binary of binaries) {
      try {
        await fs.access(binary);
        const { stdout } = await execAsync(`strings "${binary}" | grep -o "is\\.workflow\\.actions\\.[a-zA-Z0-9_]*" | sort | uniq`);
        const actions = stdout.trim().split('\n').filter(Boolean);

        console.log(`  Found ${actions.length} actions in ${path.basename(binary)}`);

        actions.forEach(action => {
          if (!this.discoveredActions.has(action)) {
            this.discoveredActions.set(action, {
              identifier: action,
              source: `binary:${path.basename(binary)}`,
              confidence: 'high'
            });
          }
        });
      } catch (error) {
        console.log(`  Could not process ${binary}: ${error.message}`);
      }
    }
  }

  private async extractFromFrameworks(): Promise<void> {
    console.log('🔧 Extracting actions from frameworks...');

    const frameworkPaths = [
      '/System/Library/Frameworks',
      '/System/iOSSupport/System/Library/Frameworks',
      '/System/Library/PrivateFrameworks'
    ];

    for (const frameworkPath of frameworkPaths) {
      try {
        const { stdout } = await execAsync(
          `find "${frameworkPath}" -name "*.framework" -maxdepth 1 | head -20 | xargs -I {} strings {}/Versions/A/* 2>/dev/null | grep -o "is\\.workflow\\.actions\\.[a-zA-Z0-9_]*" | sort | uniq`
        );

        const actions = stdout.trim().split('\n').filter(Boolean);
        console.log(`  Found ${actions.length} actions in ${path.basename(frameworkPath)}`);

        actions.forEach(action => {
          if (!this.discoveredActions.has(action)) {
            this.discoveredActions.set(action, {
              identifier: action,
              source: `framework:${path.basename(frameworkPath)}`,
              confidence: 'high'
            });
          } else {
            // Update existing action with additional source
            const existing = this.discoveredActions.get(action)!;
            if (!existing.source.includes(frameworkPath)) {
              existing.source += `,framework:${path.basename(frameworkPath)}`;
            }
          }
        });
      } catch (error) {
        console.log(`  Could not process ${frameworkPath}: ${error.message}`);
      }
    }
  }

  private async extractFromShortcutSample(): Promise<void> {
    console.log('📋 Extracting actions from shortcut samples...');

    try {
      // Get a diverse sample of shortcuts (not all 786)
      const { stdout: shortcutList } = await execAsync('shortcuts list | head -50');
      const shortcuts = shortcutList.trim().split('\n').filter(Boolean);

      console.log(`  Analyzing ${shortcuts.length} shortcuts...`);

      for (const shortcut of shortcuts) {
        try {
          const { stdout: shortcutContent } = await execAsync(`shortcuts view "${shortcut}"`);
          const actions = shortcutContent.match(/is\.workflow\.actions\.[a-zA-Z0-9_]*/g) || [];

          actions.forEach(action => {
            if (!this.discoveredActions.has(action)) {
              this.discoveredActions.set(action, {
                identifier: action,
                source: `shortcut:${shortcut}`,
                confidence: 'medium',
                sourceShortcut: shortcut
              });
            } else {
              // Add usage example
              const existing = this.discoveredActions.get(action)!;
              if (!existing.exampleUsage) {
                existing.exampleUsage = `Found in "${shortcut}"`;
              }
              existing.confidence = 'high'; // Multiple sources = higher confidence
            }
          });
        } catch (error) {
          console.log(`    Could not process "${shortcut}": ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  Could not access shortcuts: ${error.message}`);
    }
  }

  private async crossReferenceActions(): Promise<void> {
    console.log('🔍 Cross-referencing and validating actions...');

    // Remove duplicates and validate format
    const validActions = new Map<string, DiscoveredAction>();

    for (const [identifier, action] of this.discoveredActions) {
      // Validate action identifier format
      if (this.isValidActionIdentifier(identifier)) {
        validActions.set(identifier, action);
      } else {
        console.log(`  Invalid action identifier: ${identifier}`);
      }
    }

    this.discoveredActions = validActions;
    console.log(`  Validated ${this.discoveredActions.size} unique actions`);
  }

  private isValidActionIdentifier(identifier: string): boolean {
    // Must match pattern: is.workflow.actions.[name]
    return /^is\.workflow\.actions\.[a-zA-Z0-9_]+$/.test(identifier);
  }

  private async buildEnhancedDatabase(): Promise<void> {
    console.log('🗄️  Building enhanced action database...');

    let addedCount = 0;
    let updatedCount = 0;

    for (const [identifier, discovered] of this.discoveredActions) {
      if (!this.actionDatabase[identifier]) {
        // Create new action entry
        this.actionDatabase[identifier] = {
          identifier,
          name: this.generateActionName(identifier),
          description: `Discovered action: ${identifier}`,
          category: this.inferCategory(identifier),
          parameters: [],
          inputTypes: this.inferInputTypes(identifier),
          outputTypes: this.inferOutputTypes(identifier),
          permissions: this.inferPermissions(identifier),
          confidence: discovered.confidence,
          discoveredFrom: [discovered.source],
          usageExamples: discovered.exampleUsage ? [discovered.exampleUsage] : []
        };
        addedCount++;
      } else {
        // Update existing action
        const existing = this.actionDatabase[identifier];
        if (existing && existing.discoveredFrom && !existing.discoveredFrom.includes(discovered.source)) {
          existing.discoveredFrom.push(discovered.source);
        }
        if (discovered.exampleUsage && existing.usageExamples && !existing.usageExamples.includes(discovered.exampleUsage)) {
          existing.usageExamples.push(discovered.exampleUsage);
        }
        // Upgrade confidence if we have multiple sources
        if (existing.discoveredFrom.length > 2) {
          existing.confidence = 'high';
        }
        updatedCount++;
      }
    }

    console.log(`  Added ${addedCount} new actions`);
    console.log(`  Updated ${updatedCount} existing actions`);
    console.log(`  Total actions: ${Object.keys(this.actionDatabase).length}`);

    // Save enhanced database
    await this.saveDatabase();

    // Generate statistics
    await this.generateStatistics();
  }

  private generateActionName(identifier: string): string {
    return identifier
      .replace('is.workflow.actions.', '')
      .split(/[_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private inferCategory(identifier: string): string {
    const id = identifier.toLowerCase();

    if (id.includes('text') || id.includes('string')) return 'text';
    if (id.includes('notification') || id.includes('alert')) return 'notification';
    if (id.includes('url') || id.includes('web') || id.includes('http')) return 'web';
    if (id.includes('speak') || id.includes('play') || id.includes('music') || id.includes('sound')) return 'media';
    if (id.includes('copy') || id.includes('clipboard')) return 'clipboard';
    if (id.includes('variable') || id.includes('set') || id.includes('get')) return 'scripting';
    if (id.includes('conditional') || id.includes('if') || id.includes('repeat') || id.includes('loop')) return 'scripting';
    if (id.includes('wait') || id.includes('delay') || id.includes('sleep')) return 'scripting';
    if (id.includes('ask') || id.includes('input') || id.includes('prompt')) return 'scripting';
    if (id.includes('location') || id.includes('map') || id.includes('gps')) return 'location';
    if (id.includes('photo') || id.includes('camera') || id.includes('image')) return 'camera';
    if (id.includes('video') || id.includes('movie')) return 'camera';
    if (id.includes('music') || id.includes('audio') || id.includes('record')) return 'media';
    if (id.includes('date') || id.includes('time') || id.includes('calendar')) return 'data';
    if (id.includes('calculate') || id.includes('math') || id.includes('number')) return 'data';
    if (id.includes('note') || id.includes('document') || id.includes('file')) return 'files';
    if (id.includes('email') || id.includes('mail') || id.includes('message') || id.includes('sms')) return 'communication';
    if (id.includes('phone') || id.includes('call')) return 'communication';
    if (id.includes('contact') || id.includes('address')) return 'communication';
    if (id.includes('app') || id.includes('open')) return 'apps';
    if (id.includes('brightness') || id.includes('volume') || id.includes('wifi') || id.includes('bluetooth')) return 'device';
    if (id.includes('weather') || id.includes('temperature')) return 'location';

    return 'general';
  }

  private inferInputTypes(identifier: string): string[] {
    const id = identifier.toLowerCase();

    if (id.includes('text') || id.includes('string')) return ['WFStringContentItem'];
    if (id.includes('url') || id.includes('web')) return ['WFURLContentItem'];
    if (id.includes('image') || id.includes('photo')) return ['WFImageContentItem'];
    if (id.includes('number') || id.includes('calculate')) return ['WFNumberContentItem'];
    if (id.includes('date') || id.includes('time')) return ['WFDateContentItem'];
    if (id.includes('location')) return ['WFLocationContentItem'];
    if (id.includes('contact')) return ['WFContactContentItem'];

    return ['any'];
  }

  private inferOutputTypes(identifier: string): string[] {
    const id = identifier.toLowerCase();

    if (id.includes('get') || id.includes('extract')) {
      if (id.includes('text')) return ['WFStringContentItem'];
      if (id.includes('image')) return ['WFImageContentItem'];
      if (id.includes('number')) return ['WFNumberContentItem'];
      if (id.includes('date')) return ['WFDateContentItem'];
      if (id.includes('location')) return ['WFLocationContentItem'];
      return ['any'];
    }

    return [];
  }

  private inferPermissions(identifier: string): string {
    const id = identifier.toLowerCase();

    if (id.includes('notification')) return 'notification';
    if (id.includes('camera') || id.includes('photo')) return 'camera';
    if (id.includes('microphone') || id.includes('record')) return 'microphone';
    if (id.includes('location')) return 'location';
    if (id.includes('contact') || id.includes('address') || id.includes('phone')) return 'contacts';
    if (id.includes('photo') && id.includes('select')) return 'photo-library';
    if (id.includes('brightness') || id.includes('volume') || id.includes('wifi')) return 'device';

    return 'none';
  }

  private async saveDatabase(): Promise<void> {
    const outputPath = '/Users/scrimwiggins/shortcut-genius-main/enhanced-action-database.json';
    await fs.writeFile(outputPath, JSON.stringify(this.actionDatabase, null, 2));
    console.log(`  Enhanced database saved to: ${outputPath}`);
  }

  private async generateStatistics(): Promise<void> {
    const stats = {
      totalActions: Object.keys(this.actionDatabase).length,
      highConfidence: Object.values(this.actionDatabase).filter(a => a.confidence === 'high').length,
      mediumConfidence: Object.values(this.actionDatabase).filter(a => a.confidence === 'medium').length,
      lowConfidence: Object.values(this.actionDatabase).filter(a => a.confidence === 'low').length,
      categories: {} as Record<string, number>,
      newSinceOriginal: 0
    };

    // Count by category
    Object.values(this.actionDatabase).forEach(action => {
      stats.categories[action.category] = (stats.categories[action.category] || 0) + 1;
    });

    // Count new actions
    const originalCount = 54; // From original database
    stats.newSinceOriginal = Math.max(0, stats.totalActions - originalCount);

    console.log('\n📊 Discovery Statistics:');
    console.log(`  Total actions: ${stats.totalActions}`);
    console.log(`  New actions discovered: ${stats.newSinceOriginal}`);
    console.log(`  High confidence: ${stats.highConfidence}`);
    console.log(`  Medium confidence: ${stats.mediumConfidence}`);
    console.log(`  Low confidence: ${stats.lowConfidence}`);
    console.log('  Categories:');
    Object.entries(stats.categories).forEach(([category, count]) => {
      console.log(`    ${category}: ${count}`);
    });

    // Save statistics
    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/discovery-stats.json', JSON.stringify(stats, null, 2));
  }

  getDiscoveredActions(): Map<string, DiscoveredAction> {
    return this.discoveredActions;
  }

  getActionDatabase(): ActionDatabase {
    return this.actionDatabase;
  }
}

// Run discovery if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const discovery = new EnhancedActionDiscovery();
  discovery.discoverAllActions().catch(console.error);
}