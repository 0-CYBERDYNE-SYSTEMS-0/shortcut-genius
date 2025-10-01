import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class AggressiveActionDiscovery {
  private discoveredActions: Set<string> = new Set();
  private actionExamples: Map<string, string[]> = new Map();
  private actionSources: Map<string, Set<string>> = new Map();

  async discoverAllActions(): Promise<void> {
    console.log('🚀 Starting aggressive action discovery...\n');

    // Phase 1: Massive shortcut sampling
    await this.extractFromManyShortcuts();

    // Phase 2: Deep framework mining
    await this.extractFromAllFrameworks();

    // Phase 3: System-wide string search
    await this.systemWideStringSearch();

    // Phase 4: Community resources integration
    await this.importCommunityResources();

    // Phase 5: Build comprehensive database
    await this.buildComprehensiveDatabase();

    console.log('\n✅ Aggressive discovery complete!');
  }

  private async extractFromManyShortcuts(): Promise<void> {
    console.log('📋 Extracting from large shortcut sample...');

    try {
      // Get ALL shortcuts (or a very large sample)
      const { stdout: shortcutList } = await execAsync('shortcuts list');
      const shortcuts = shortcutList.trim().split('\n').filter(Boolean);

      console.log(`  Processing ${shortcuts.length} shortcuts...`);

      let processedCount = 0;
      for (const shortcut of shortcuts) {
        try {
          const { stdout: shortcutContent } = await execAsync(`shortcuts view "${shortcut}"`);
          const actions = shortcutContent.match(/is\.workflow\.actions\.[a-zA-Z0-9_]*/g) || [];

          actions.forEach(action => {
            this.discoveredActions.add(action);

            // Add source
            if (!this.actionSources.has(action)) {
              this.actionSources.set(action, new Set());
            }
            this.actionSources.get(action)!.add(`shortcut:${shortcut}`);

            // Add example
            if (!this.actionExamples.has(action)) {
              this.actionExamples.set(action, []);
            }
            const examples = this.actionExamples.get(action)!;
            if (!examples.includes(shortcut) && examples.length < 3) {
              examples.push(shortcut);
            }
          });

          processedCount++;
          if (processedCount % 100 === 0) {
            console.log(`    Processed ${processedCount}/${shortcuts.length} shortcuts...`);
          }
        } catch (error) {
          // Skip problematic shortcuts
        }
      }

      console.log(`  Extracted actions from ${processedCount} shortcuts`);
    } catch (error) {
      console.log(`  Could not access shortcuts: ${error.message}`);
    }
  }

  private async extractFromAllFrameworks(): Promise<void> {
    console.log('🔧 Deep framework mining...');

    const searchPaths = [
      '/System/Library/Frameworks',
      '/System/Library/PrivateFrameworks',
      '/System/iOSSupport/System/Library/Frameworks',
      '/System/iOSSupport/System/Library/PrivateFrameworks',
      '/System/Library/CoreServices',
      '/System/Library/PreferencePanes',
      '/System/Applications'
    ];

    for (const searchPath of searchPaths) {
      try {
        const command = `find "${searchPath}" -type f -name "*.framework" -o -name "*.app" -o -name "*.dylib" | head -50 | xargs -I {} sh -c 'strings "{}" 2>/dev/null | grep "is\\.workflow\\.actions\\.[a-zA-Z0-9_]*" || true'`;

        const { stdout } = await execAsync(command);
        const actions = stdout.trim().split('\n').filter(Boolean);

        console.log(`  Found ${actions.length} actions in ${path.basename(searchPath)}`);

        actions.forEach(action => {
          if (action) {
            this.discoveredActions.add(action);

            if (!this.actionSources.has(action)) {
              this.actionSources.set(action, new Set());
            }
            this.actionSources.get(action)!.add(`framework:${searchPath}`);
          }
        });
      } catch (error) {
        // Skip inaccessible paths
      }
    }
  }

  private async systemWideStringSearch(): Promise<void> {
    console.log('🌐 System-wide string search...');

    try {
      // Search common system locations
      const searchLocations = [
        '/System/Library',
        '/usr/bin',
        '/usr/lib',
        '/Applications'
      ];

      for (const location of searchLocations) {
        try {
          const command = `find "${location}" -type f -size -1M 2>/dev/null | head -100 | xargs strings 2>/dev/null | grep "is\\.workflow\\.actions\\.[a-zA-Z0-9_]*" | sort - uniq || true`;

          const { stdout } = await execAsync(command);
          const actions = stdout.trim().split('\n').filter(Boolean);

          if (actions.length > 0) {
            console.log(`  Found ${actions.length} additional actions in ${location}`);
            actions.forEach(action => {
              if (action) {
                this.discoveredActions.add(action);
                if (!this.actionSources.has(action)) {
                  this.actionSources.set(action, new Set());
                }
                this.actionSources.get(action)!.add(`system:${location}`);
              }
            });
          }
        } catch (error) {
          // Skip inaccessible locations
        }
      }
    } catch (error) {
      console.log(`  System-wide search failed: ${error.message}`);
    }
  }

  private async importCommunityResources(): Promise<void> {
    console.log('🌍 Importing community resources...');

    // Add known actions from community knowledge
    const knownActions = [
      // File & Document Actions
      'is.workflow.actions.documentpicker.open',
      'is.workflow.actions.documentpicker.save',
      'is.workflow.actions.createfolder',
      'is.workflow.actions.getfile',
      'is.workflow.actions.savefile',
      'is.workflow.actions.deletefiles',
      'is.workflow.actions.movefile',
      'is.workflow.actions.copyfile',
      'is.workflow.actions.getcontentsoffile',
      'is.workflow.actions.appendtofile',
      'is.workflow.createpdf',
      'is.workflow.actions.archive',
      'is.workflow.actions.unarchive',

      // Text Processing
      'is.workflow.actions.gettextfrominput',
      'is.workflow.actions.matchtext',
      'is.workflow.actions.replacetext',
      'is.workflow.actions.changecase',
      'is.workflow.actions.splittext',
      'is.workflow.actions.combinetext',
      'is.workflow.actions.count',
      'is.workflow.actions.formatnumber',
      'is.workflow.actions.formatdate',
      'is.workflow.actions.detectlanguage',
      'is.workflow.actions.translatetext',

      // Spreadsheet & Data
      'is.workflow.actions.getcontentsofspreadsheet',
      'is.workflow.actions.setspreadsheetcell',
      'is.workflow.actions.addrowstospreadsheet',
      'is.workflow.actions.createspreadsheet',
      'is.workflow.actions.filterspreadsheet',
      'is.workflow.actions.sortspreadsheet',

      // Calendar Events
      'is.workflow.actions.createcalendarevent',
      'is.workflow.actions.getcalendarevents',
      'is.workflow.actions.modifycalendarevents',
      'is.workflow.actions.deletecalendarevents',
      'is.workflow.actions.findcalendars',

      // Reminders
      'is.workflow.actions.createreminder',
      'is.workflow.actions.getreminders',
      'is.workflow.actions.modifyreminders',
      'is.workflow.actions.deletereminders',
      'is.workflow.actions.findreminderlists',

      // Contacts
      'is.workflow.actions.findcontacts',
      'is.workflow.actions.getcontactdetails',
      'is.workflow.actions.createcontact',
      'is.workflow.actions.modifycontact',
      'is.workflow.actions.deletecontact',

      // Health & Fitness
      'is.workflow.actions.loghealthsample',
      'is.workflow.actions.gethealthsample',
      'is.workflow.actions.gethealthquantitytype',
      'is.workflow.actions.starthealthworkout',
      'is.workflow.actions.stophealthworkout',
      'is.workflow.actions.pausehealthworkout',
      'is.workflow.actions.resumehealthworkout',

      // HomeKit
      'is.workflow.actions.controlhomeaccessory',
      'is.workflow.actions.gethomeaccessorystate',
      'is.workflow.actions.findhomeaccessories',
      'is.workflow.actions.findhomes',
      'is.workflow.actions.gethomeroomstate',
      'is.workflow.actions.controlhomeroom',

      // Maps & Navigation
      'is.workflow.actions.getdirections',
      'is.workflow.actions.getdistancetravelled',
      'is.workflow.actions.gettraveltime',
      'is.workflow.actions.searchformaps',
      'is.workflow.actions.showonmap',

      // Music & Audio
      'is.workflow.actions.playmusic',
      'is.workflow.actions.pausemusic',
      'is.workflow.actions.skipmusic',
      'is.workflow.actions.getcurrentsong',
      'is.workflow.actions.getmusiclibrary',
      'is.workflow.actions.addtoplaylist',
      'is.workflow.actions.createplaylist',
      'is.workflow.actions.recordaudio',
      'is.workflow.actions.getvolume',
      'is.workflow.actions.setvolume',

      // Photos & Videos
      'is.workflow.actions.selectphotos',
      'is.workflow.actions.getlatestphotos',
      'is.workflow.actions.getlatestvideos',
      'is.workflow.actions.savephotolibrary',
      'is.workflow.actions.getimagesfrominput',
      'is.workflow.actions.resizeimage',
      'is.workflow.actions.cropimage',
      'is.workflow.actions.rotateimage',
      'is.workflow.actions.convertimage',
      'is.workflow.actions.makegif',
      'is.workflow.actions.trimvideo',
      'is.workflow.actions.combinevideos',

      // Web & HTTP
      'is.workflow.actions.getcontentsofurl',
      'is.workflow.actions.downloadurl',
      'is.workflow.actions.expandurl',
      'is.workflow.actions.getrssfeed',
      'is.workflow.actions.getarticle',
      'is.workflow.actions.getcomponentsfromurl',
      'is.workflow.actions.encoding',
      'is.workflow.actions.hash',

      // System & Device
      'is.workflow.actions.setairplanemode',
      'is.workflow.actions.setbluetooth',
      'is.workflow.actions.setwifi',
      'is.workflow.actions.setcellulardata',
      'is.workflow.actions.setlowpowermode',
      'is.workflow.actions.setflashlight',
      'is.workflow.actions.getbatterylevel',
      'is.workflow.actions.getdevicedetails',
      'is.workflow.actions.getnetworkdetails',
      'is.workflow.actions.screenshot',
      'is.workflow.actions.getscreenbrightness',
      'is.workflow.actions.setsilentmode',

      // Scripting & Automation
      'is.workflow.actions.runscript',
      'is.workflow.actions.runjavascript',
      'is.workflow.actions.runshellscript',
      'is.workflow.actions.evaluatescript',
      'is.workflow.actions.runshortcut',
      'is.workflow.actions.dismissshortcut',
      'is.workflow.actions.continueinshortcut',
      'is.workflow.actions.waittoreturn',
      'is.workflow.actions.count',
      'is.workflow.actions.average',
      'is.workflow.actions.max',
      'is.workflow.actions.min',
      'is.workflow.actions.sum',
      'is.workflow.actions.randomnumber',

      // UI & Interaction
      'is.workflow.actions.showinapp',
      'is.workflow.activities',
      'is.workflow.actions.show',
      'is.workflow.actions.dismiss',
      'is.workflow.actions.lockscreen',
      'is.workflow.actions.openshare_sheet',
      'is.workflow.actions.scanqrcode',
      'is.workflow.actions.generateqrcode',
      'is.workflow.actions.getbarcode',
      'is.workflow.actions.createbarcode',

      // Advanced & Specialized
      'is.workflow.actions.detectlanguage',
      'is.workflow.actions.speechrecognize',
      'is.workflow.actions.textrecognition',
      'is.workflow.actions.objectdetection',
      'is.workflow.actions.scenetextrecognition',
      'is.workflow.actions.imagerecognition',
      'is.workflow.actions.classifyimage',
      'is.workflow.actions.detectlandmarks',
      'is.workflow.actions.detectrectangles',
      'is.workflow.actions.detectfaces',
      'is.workflow.actions.imagereasoning',

      // Content & Data Types
      'is.workflow.actions.gettype',
      'is.workflow.actions.coerce',
      'is.workflow.actions.getvalueforkey',
      'is.workflow.actions.setvalueforkey',
      'is.workflow.actions.getdictionaryvalue',
      'is.workflow.actions.setdictionaryvalue',
      'is.workflow.actions.getlistitem',
      'is.workflow.actions.addtolist',
      'is.workflow.actions.inserttolist',
      'is.workflow.actions.removelistitem',
      'is.workflow.actions.countlist',

      // Payment & Commerce
      'is.workflow.actions.makepayment',
      'is.workflow.actions.getpaymentdetails',
      'is.workflow.actions.applepay',
      'is.workflow.actions.getpaymentmethod',

      // Social & Sharing
      'is.workflow.actions.posttotwitter',
      'is.workflow.actions.posttofacebook',
      'is.workflow.actions.share',
      'is.workflow.actions.airdrop',
      'is.workflow.actions.openin'
    ];

    console.log(`  Adding ${knownActions.length} known community actions`);

    knownActions.forEach(action => {
      this.discoveredActions.add(action);

      if (!this.actionSources.has(action)) {
        this.actionSources.set(action, new Set());
      }
      this.actionSources.get(action)!.add('community:known-actions');
    });
  }

  private async buildComprehensiveDatabase(): Promise<void> {
    console.log('🗄️  Building comprehensive database...');

    // Load existing database
    let existingDatabase: any = {};
    try {
      const data = await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/action-database.json', 'utf8');
      existingDatabase = JSON.parse(data);
    } catch (error) {
      console.log('  No existing database found');
    }

    // Create enhanced database
    const enhancedDatabase: any = existingDatabase;

    let addedCount = 0;
    for (const actionIdentifier of this.discoveredActions) {
      if (!enhancedDatabase[actionIdentifier]) {
        enhancedDatabase[actionIdentifier] = {
          identifier: actionIdentifier,
          name: this.generateActionName(actionIdentifier),
          description: this.generateDescription(actionIdentifier),
          category: this.inferCategory(actionIdentifier),
          parameters: this.generateParameters(actionIdentifier),
          inputTypes: this.inferInputTypes(actionIdentifier),
          outputTypes: this.inferOutputTypes(actionIdentifier),
          permissions: this.inferPermissions(actionIdentifier)
        };
        addedCount++;
      }

      // Add discovery metadata
      const sources = Array.from(this.actionSources.get(actionIdentifier) || []);
      const examples = this.actionExamples.get(actionIdentifier) || [];

      enhancedDatabase[actionIdentifier].discoveredFrom = sources;
      enhancedDatabase[actionIdentifier].usageExamples = examples;
      enhancedDatabase[actionIdentifier].confidence = this.calculateConfidence(sources, examples);
    }

    console.log(`  Added ${addedCount} new actions`);
    console.log(`  Total actions: ${Object.keys(enhancedDatabase).length}`);

    // Save comprehensive database
    await fs.writeFile(
      '/Users/scrimwiggins/shortcut-genius-main/comprehensive-action-database.json',
      JSON.stringify(enhancedDatabase, null, 2)
    );

    // Generate statistics
    await this.generateStatistics(enhancedDatabase);
  }

  private generateActionName(identifier: string): string {
    return identifier
      .replace('is.workflow.actions.', '')
      .split(/[_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateDescription(identifier: string): string {
    const name = this.generateActionName(identifier);
    return `Action: ${name}`;
  }

  private generateParameters(identifier: string): Array<any> {
    // Basic parameter inference based on action type
    const id = identifier.toLowerCase();

    if (id.includes('text') && !id.includes('get')) {
      return [
        { key: 'WFTextActionText', type: 'string', description: 'Text content', required: true }
      ];
    }

    if (id.includes('url') && !id.includes('get')) {
      return [
        { key: 'WFURLActionURL', type: 'string', description: 'URL to open', required: true }
      ];
    }

    if (id.includes('wait')) {
      return [
        { key: 'WFWaitActionWaitTime', type: 'number', description: 'Wait time in seconds', required: true, defaultValue: 1 }
      ];
    }

    if (id.includes('set') && (id.includes('volume') || id.includes('brightness'))) {
      return [
        { key: 'WFSetValue', type: 'number', description: 'Value to set', required: true }
      ];
    }

    return [];
  }

  private inferCategory(identifier: string): string {
    const id = identifier.toLowerCase();

    if (id.includes('text') || id.includes('string')) return 'text';
    if (id.includes('notification') || id.includes('alert')) return 'notification';
    if (id.includes('url') || id.includes('web') || id.includes('http')) return 'web';
    if (id.includes('speak') || id.includes('play') || id.includes('music')) return 'media';
    if (id.includes('copy') || id.includes('clipboard')) return 'clipboard';
    if (id.includes('variable') || id.includes('set') || id.includes('get') || id.includes('script') || id.includes('javascript')) return 'scripting';
    if (id.includes('conditional') || id.includes('if') || id.includes('repeat') || id.includes('loop')) return 'scripting';
    if (id.includes('location') || id.includes('map') || id.includes('gps')) return 'location';
    if (id.includes('photo') || id.includes('camera') || id.includes('image') || id.includes('video')) return 'camera';
    if (id.includes('music') || id.includes('audio') || id.includes('record')) return 'media';
    if (id.includes('date') || id.includes('time') || id.includes('calendar')) return 'data';
    if (id.includes('calculate') || id.includes('math') || id.includes('number') || id.includes('count')) return 'data';
    if (id.includes('note') || id.includes('document') || id.includes('file') || id.includes('spreadsheet')) return 'files';
    if (id.includes('email') || id.includes('mail') || id.includes('message') || id.includes('sms') || id.includes('contact')) return 'communication';
    if (id.includes('phone') || id.includes('call')) return 'communication';
    if (id.includes('app') || id.includes('open')) return 'apps';
    if (id.includes('brightness') || id.includes('volume') || id.includes('wifi') || id.includes('bluetooth') || id.includes('device')) return 'device';
    if (id.includes('weather') || id.includes('temperature')) return 'location';
    if (id.includes('health') || id.includes('workout') || id.includes('fitness')) return 'health';
    if (id.includes('home') || id.includes('accessory') || id.includes('homekit')) return 'smarthome';
    if (id.includes('payment') || id.includes('pay')) return 'commerce';
    if (id.includes('social') || id.includes('share') || id.includes('post')) return 'social';

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
    if (id.includes('file')) return ['WFGenericFileContentItem'];

    return ['any'];
  }

  private inferOutputTypes(identifier: string): string[] {
    const id = identifier.toLowerCase();

    if (id.includes('get') || id.includes('extract') || id.includes('detect')) {
      if (id.includes('text')) return ['WFStringContentItem'];
      if (id.includes('image')) return ['WFImageContentItem'];
      if (id.includes('number')) return ['WFNumberContentItem'];
      if (id.includes('date')) return ['WFDateContentItem'];
      if (id.includes('location')) return ['WFLocationContentItem'];
      if (id.includes('contact')) return ['WFContactContentItem'];
      if (id.includes('file')) return ['WFGenericFileContentItem'];
      return ['any'];
    }

    return [];
  }

  private inferPermissions(identifier: string): string {
    const id = identifier.toLowerCase();

    if (id.includes('notification')) return 'notification';
    if (id.includes('camera') || id.includes('photo')) return 'camera';
    if (id.includes('microphone') || id.includes('record') || id.includes('speech')) return 'microphone';
    if (id.includes('location')) return 'location';
    if (id.includes('contact') || id.includes('address') || id.includes('phone')) return 'contacts';
    if (id.includes('photo') && id.includes('select')) return 'photo-library';
    if (id.includes('brightness') || id.includes('volume') || id.includes('wifi') || id.includes('bluetooth') || id.includes('device')) return 'device';
    if (id.includes('health') || id.includes('workout')) return 'health';
    if (id.includes('home') || id.includes('homekit')) return 'home';

    return 'none';
  }

  private calculateConfidence(sources: string[], examples: string[]): 'high' | 'medium' | 'low' {
    if (sources.length >= 3 || examples.length >= 2) return 'high';
    if (sources.length >= 2 || examples.length >= 1) return 'medium';
    return 'low';
  }

  private async generateStatistics(database: any): Promise<void> {
    const actions = Object.values(database);

    const stats = {
      totalActions: actions.length,
      confidenceLevels: {
        high: actions.filter((a: any) => a.confidence === 'high').length,
        medium: actions.filter((a: any) => a.confidence === 'medium').length,
        low: actions.filter((a: any) => a.confidence === 'low').length
      },
      categories: {} as Record<string, number>,
      permissionLevels: {} as Record<string, number>,
      sources: {} as Record<string, number>
    };

    // Count categories
    actions.forEach((action: any) => {
      stats.categories[action.category] = (stats.categories[action.category] || 0) + 1;

      const permission = action.permissions || 'none';
      stats.permissionLevels[permission] = (stats.permissionLevels[permission] || 0) + 1;

      if (action.discoveredFrom) {
        action.discoveredFrom.forEach((source: string) => {
          const sourceType = source.split(':')[0];
          stats.sources[sourceType] = (stats.sources[sourceType] || 0) + 1;
        });
      }
    });

    console.log('\n📊 Comprehensive Database Statistics:');
    console.log(`  Total actions: ${stats.totalActions}`);
    console.log(`  High confidence: ${stats.confidenceLevels.high}`);
    console.log(`  Medium confidence: ${stats.confidenceLevels.medium}`);
    console.log(`  Low confidence: ${stats.confidenceLevels.low}`);
    console.log('  Categories:');
    Object.entries(stats.categories).forEach(([category, count]) => {
      console.log(`    ${category}: ${count}`);
    });
    console.log('  Sources:');
    Object.entries(stats.sources).forEach(([source, count]) => {
      console.log(`    ${source}: ${count}`);
    });

    // Save statistics
    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/comprehensive-stats.json', JSON.stringify(stats, null, 2));
  }

  getDiscoveredActions(): Set<string> {
    return this.discoveredActions;
  }
}

// Run discovery if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const discovery = new AggressiveActionDiscovery();
  discovery.discoverAllActions().catch(console.error);
}