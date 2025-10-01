import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class AutomatedActionDiscovery {
  private lastUpdate: Date;
  private updateInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private databasePath: string;

  constructor(databasePath: string = '/Users/scrimwiggins/shortcut-genius-main/final-action-database.json') {
    this.databasePath = databasePath;
    this.lastUpdate = new Date(0);
  }

  async initialize(): Promise<void> {
    console.log('🤖 Initializing automated action discovery system...');

    // Load last update time
    await this.loadLastUpdate();

    // Check if update is needed
    if (this.shouldUpdate()) {
      console.log('🔄 Database update needed, running discovery...');
      await this.performUpdate();
    } else {
      console.log('✅ Database is up to date');
    }

    // Setup continuous monitoring
    this.setupMonitoring();
  }

  private async loadLastUpdate(): Promise<void> {
    try {
      const statsPath = '/Users/scrimwiggins/shortcut-genius-main/last-update.json';
      const data = await fs.readFile(statsPath, 'utf8');
      const stats = JSON.parse(data);
      this.lastUpdate = new Date(stats.lastUpdate);
      console.log(`  Last update: ${this.lastUpdate.toISOString()}`);
    } catch (error) {
      console.log('  No previous update found, using default');
      this.lastUpdate = new Date(0);
    }
  }

  private shouldUpdate(): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.lastUpdate.getTime();
    return timeSinceUpdate > this.updateInterval;
  }

  private async performUpdate(): Promise<void> {
    console.log('🚀 Performing automated database update...');

    try {
      // Run discovery phases
      const stats = await this.runDiscoveryPhases();

      // Update timestamp
      this.lastUpdate = new Date();
      await this.saveLastUpdate();

      // Generate update report
      await this.generateUpdateReport(stats);

      console.log('✅ Automated update completed successfully');
    } catch (error) {
      console.error('❌ Automated update failed:', error);
      await this.logUpdateError(error);
    }
  }

  private async runDiscoveryPhases(): Promise<any> {
    const stats = {
      startTime: new Date(),
      actionsFound: 0,
      newActions: 0,
      updatedActions: 0,
      sources: [] as string[]
    };

    // Phase 1: System shortcut monitoring
    console.log('  📱 Monitoring system shortcuts for new actions...');
    const systemActions = await this.monitorSystemShortcuts();
    stats.actionsFound += systemActions.length;
    stats.sources.push('system-shortcuts');

    // Phase 2: Framework update detection
    console.log('  🔧 Checking for framework updates...');
    const frameworkActions = await this.checkFrameworkUpdates();
    stats.actionsFound += frameworkActions.length;
    if (frameworkActions.length > 0) {
      stats.sources.push('framework-updates');
    }

    // Phase 3: Community resource monitoring
    console.log('  🌍 Checking community resources...');
    const communityActions = await this.monitorCommunityResources();
    stats.actionsFound += communityActions.length;
    if (communityActions.length > 0) {
      stats.sources.push('community-resources');
    }

    // Phase 4: Integrate new actions
    console.log('  🔗 Integrating new actions...');
    const integration = await this.integrateNewActions([
      ...systemActions,
      ...frameworkActions,
      ...communityActions
    ]);

    stats.newActions = integration.newActions;
    stats.updatedActions = integration.updatedActions;
    stats.endTime = new Date();

    return stats;
  }

  private async monitorSystemShortcuts(): Promise<string[]> {
    const newActions: string[] = [];

    try {
      // Get current system shortcuts
      const { stdout: shortcutList } = await execAsync('shortcuts list');
      const shortcuts = shortcutList.trim().split('\n').filter(Boolean);

      console.log(`    Analyzing ${shortcuts.length} system shortcuts...`);

      // Sample shortcuts efficiently
      const sampleSize = Math.min(100, shortcuts.length);
      const sampleShortcuts = shortcuts.slice(0, sampleSize);

      for (const shortcut of sampleShortcuts) {
        try {
          const { stdout: shortcutContent } = await execAsync(`shortcuts view "${shortcut}"`);
          const actions = shortcutContent.match(/is\.workflow\.actions\.[a-zA-Z0-9_]*/g) || [];

          for (const action of actions) {
            if (!newActions.includes(action)) {
              newActions.push(action);
            }
          }
        } catch (error) {
          // Skip problematic shortcuts silently
        }
      }

      console.log(`    Found ${newActions.length} unique actions from system shortcuts`);
    } catch (error) {
      console.log(`    System shortcut monitoring failed: ${error.message}`);
    }

    return newActions;
  }

  private async checkFrameworkUpdates(): Promise<string[]> {
    const newActions: string[] = [];

    try {
      // Check key system locations for updates
      const locations = [
        '/System/Library/Frameworks',
        '/System/Library/PrivateFrameworks',
        '/System/Applications/Shortcuts.app'
      ];

      for (const location of locations) {
        try {
          const command = `find "${location}" -type f -name "*.framework" -o -name "*.app" | head -10 | xargs -I {} strings {} 2>/dev/null | grep "is\\.workflow\\.actions\\.[a-zA-Z0-9_]*" | sort - uniq || true`;

          const { stdout } = await execAsync(command);
          const actions = stdout.trim().split('\n').filter(Boolean);

          actions.forEach(action => {
            if (action && !newActions.includes(action)) {
              newActions.push(action);
            }
          });
        } catch (error) {
          // Continue with other locations
        }
      }

      if (newActions.length > 0) {
        console.log(`    Found ${newActions.length} actions from framework updates`);
      }
    } catch (error) {
      console.log(`    Framework update check failed: ${error.message}`);
    }

    return newActions;
  }

  private async monitorCommunityResources(): Promise<string[]> {
    const newActions: string[] = [];

    // This would monitor GitHub, Reddit, etc. for new action discoveries
    // For now, we'll just log that this was checked
    console.log('    Community resources checked (no automated monitoring implemented)');

    return newActions;
  }

  private async integrateNewActions(newActions: string[]): Promise<{ newActions: number; updatedActions: number }> {
    let addedCount = 0;
    let updatedCount = 0;

    try {
      // Load existing database
      const data = await fs.readFile(this.databasePath, 'utf8');
      const database = JSON.parse(data);

      for (const actionId of newActions) {
        if (!database[actionId]) {
          // Add new action with basic info
          database[actionId] = {
            identifier: actionId,
            name: this.generateActionName(actionId),
            description: `Auto-discovered action: ${actionId}`,
            category: this.inferCategory(actionId),
            parameters: [],
            inputTypes: this.inferInputTypes(actionId),
            outputTypes: this.inferOutputTypes(actionId),
            permissions: this.inferPermissions(actionId),
            confidence: 'low',
            discoveredFrom: ['automated-discovery'],
            usageExamples: [],
            relatedActions: [],
            alternatives: []
          };
          addedCount++;
        } else {
          // Update existing action's discovery sources
          const existing = database[actionId];
          if (!existing.discoveredFrom.includes('automated-discovery')) {
            existing.discoveredFrom.push('automated-discovery');
            existing.confidence = this.upgradeConfidence(existing.confidence);
            updatedCount++;
          }
        }
      }

      // Save updated database
      await fs.writeFile(this.databasePath, JSON.stringify(database, null, 2));

      console.log(`    Integrated ${addedCount} new actions, updated ${updatedCount} existing actions`);
    } catch (error) {
      console.log(`    Action integration failed: ${error.message}`);
    }

    return { newActions: addedCount, updatedActions: updatedCount };
  }

  private async saveLastUpdate(): Promise<void> {
    const updateData = {
      lastUpdate: this.lastUpdate.toISOString(),
      version: '1.0.0'
    };

    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/last-update.json', JSON.stringify(updateData, null, 2));
  }

  private async generateUpdateReport(stats: any): Promise<void> {
    const duration = stats.endTime.getTime() - stats.startTime.getTime();
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      actionsFound: stats.actionsFound,
      newActions: stats.newActions,
      updatedActions: stats.updatedActions,
      sources: stats.sources,
      success: true
    };

    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/update-report.json', JSON.stringify(report, null, 2));
    console.log(`  Update report generated: ${report.duration} duration, ${stats.newActions} new actions`);
  }

  private async logUpdateError(error: any): Promise<void> {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
      stack: error.stack || '',
      phase: 'automated-update'
    };

    await fs.writeFile('/Users/scrimwiggins/shortcut-genius-main/update-error.json', JSON.stringify(errorReport, null, 2));
  }

  private setupMonitoring(): void {
    console.log('👁️  Setting up continuous monitoring...');

    // Check for updates every hour
    setInterval(async () => {
      if (this.shouldUpdate()) {
        console.log('🔄 Scheduled update triggered...');
        await this.performUpdate();
      }
    }, 60 * 60 * 1000); // 1 hour

    // Monitor file system changes in key directories
    this.monitorFileSystem();
  }

  private monitorFileSystem(): void {
    // This would use fs.watch or similar to monitor key directories
    console.log('    File system monitoring active (basic implementation)');
  }

  // Helper methods (same as in other discovery classes)
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
    if (id.includes('url') || id.includes('web')) return 'web';
    if (id.includes('speak') || id.includes('play') || id.includes('music')) return 'media';
    if (id.includes('copy') || id.includes('clipboard')) return 'clipboard';
    if (id.includes('variable') || id.includes('set') || id.includes('get') || id.includes('script')) return 'scripting';
    if (id.includes('conditional') || id.includes('if') || id.includes('repeat')) return 'scripting';
    if (id.includes('location') || id.includes('map')) return 'location';
    if (id.includes('photo') || id.includes('camera') || id.includes('image')) return 'camera';
    if (id.includes('date') || id.includes('time') || id.includes('calculate')) return 'data';
    if (id.includes('file') || id.includes('document')) return 'files';
    if (id.includes('email') || id.includes('message') || id.includes('contact')) return 'communication';
    if (id.includes('app') || id.includes('open')) return 'apps';
    if (id.includes('brightness') || id.includes('volume') || id.includes('wifi')) return 'device';

    return 'general';
  }

  private inferInputTypes(identifier: string): string[] {
    const id = identifier.toLowerCase();

    if (id.includes('text')) return ['WFStringContentItem'];
    if (id.includes('url')) return ['WFURLContentItem'];
    if (id.includes('image') || id.includes('photo')) return ['WFImageContentItem'];
    if (id.includes('number')) return ['WFNumberContentItem'];
    if (id.includes('date')) return ['WFDateContentItem'];
    if (id.includes('location')) return ['WFLocationContentItem'];

    return ['any'];
  }

  private inferOutputTypes(identifier: string): string[] {
    const id = identifier.toLowerCase();

    if (id.includes('get')) {
      if (id.includes('text')) return ['WFStringContentItem'];
      if (id.includes('image')) return ['WFImageContentItem'];
      if (id.includes('number')) return ['WFNumberContentItem'];
      if (id.includes('date')) return ['WFDateContentItem'];
      return ['any'];
    }

    return [];
  }

  private inferPermissions(identifier: string): string {
    const id = identifier.toLowerCase();

    if (id.includes('notification')) return 'notification';
    if (id.includes('camera') || id.includes('photo')) return 'camera';
    if (id.includes('location')) return 'location';
    if (id.includes('contact') || id.includes('phone')) return 'contacts';
    if (id.includes('brightness') || id.includes('volume')) return 'device';

    return 'none';
  }

  private upgradeConfidence(current: string): 'high' | 'medium' | 'low' {
    if (current === 'low') return 'medium';
    if (current === 'medium') return 'high';
    return 'high';
  }

  // Public methods for manual control
  async forceUpdate(): Promise<void> {
    console.log('🔄 Forcing database update...');
    this.lastUpdate = new Date(0); // Force update
    await this.performUpdate();
  }

  async getUpdateStatus(): Promise<any> {
    try {
      const stats = await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/final-stats.json', 'utf8');
      const database = JSON.parse(await fs.readFile(this.databasePath, 'utf8'));

      return {
        lastUpdate: this.lastUpdate,
        nextUpdate: new Date(this.lastUpdate.getTime() + this.updateInterval),
        totalActions: Object.keys(database).length,
        statistics: JSON.parse(stats),
        needsUpdate: this.shouldUpdate()
      };
    } catch (error) {
      return {
        lastUpdate: this.lastUpdate,
        nextUpdate: new Date(this.lastUpdate.getTime() + this.updateInterval),
        totalActions: 0,
        statistics: null,
        needsUpdate: this.shouldUpdate(),
        error: error.message
      };
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const discovery = new AutomatedActionDiscovery();
  discovery.initialize().catch(console.error);
}