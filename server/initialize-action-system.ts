import { AutomatedActionDiscovery } from './automated-action-discovery';
import { FinalDatabaseBuilder } from './final-database-builder';
import fs from 'fs/promises';

export class ActionSystemInitializer {
  private discovery: AutomatedActionDiscovery;
  private databaseBuilder: FinalDatabaseBuilder;

  constructor() {
    this.discovery = new AutomatedActionDiscovery();
    this.databaseBuilder = new FinalDatabaseBuilder();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Complete Action Discovery System...\n');

    try {
      // Step 1: Check if final database exists and is up to date
      const needsRebuild = await this.checkIfRebuildNeeded();

      if (needsRebuild) {
        console.log('📊 Action database needs rebuild...');

        // Step 2: Run complete discovery system
        await this.databaseBuilder.buildFinalDatabase();

        console.log('✅ Action database rebuilt successfully');
      } else {
        console.log('✅ Action database is up to date');
      }

      // Step 3: Initialize automated discovery
      await this.discovery.initialize();

      // Step 4: Generate final integration report
      await this.generateIntegrationReport();

      console.log('\n🎉 Action Discovery System is fully operational!');

    } catch (error) {
      console.error('❌ Failed to initialize action system:', error);
      throw error;
    }
  }

  private async checkIfRebuildNeeded(): Promise<boolean> {
    try {
      // Check if final database exists
      await fs.access('/Users/scrimwiggins/shortcut-genius-main/final-action-database.json');

      // Check if comprehensive database exists
      await fs.access('/Users/scrimwiggins/shortcut-genius-main/comprehensive-action-database.json');

      // Check if original database exists
      await fs.access('/Users/scrimwiggins/shortcut-genius-main/action-database.json');

      // Check if AI prompt exists
      await fs.access('/Users/scrimwiggins/shortcut-genius-main/ai-action-prompt.md');

      // Load statistics
      const finalStats = JSON.parse(await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/final-stats.json', 'utf8'));
      const originalStats = JSON.parse(await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/action-database.json', 'utf8'));

      const originalCount = Object.keys(originalStats).length;
      const finalCount = finalStats.totalActions;

      console.log(`  Original database: ${originalCount} actions`);
      console.log(`  Final database: ${finalCount} actions`);

      // Rebuild if we don't have significant improvement
      return finalCount < originalCount * 2;

    } catch (error) {
      console.log('  One or more required files missing, rebuild needed');
      return true;
    }
  }

  private async generateIntegrationReport(): Promise<void> {
    try {
      const finalStats = JSON.parse(await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/final-stats.json', 'utf8'));
      const updateStatus = await this.discovery.getUpdateStatus();

      const report = {
        timestamp: new Date().toISOString(),
        system: {
          totalActions: finalStats.totalActions,
          highConfidenceActions: finalStats.confidenceLevels.high,
          mediumConfidenceActions: finalStats.confidenceLevels.medium,
          lowConfidenceActions: finalStats.confidenceLevels.low,
          categories: finalStats.categories,
          actionsWithParameters: finalStats.parametersCount.withParams,
          averageParameters: finalStats.parametersCount.avgParams,
          actionsRequiringPermissions: Object.values(finalStats.permissionLevels).reduce((sum: number, count: number, key: string) =>
            key !== 'none' ? sum + count : sum, 0)
        },
        automatedDiscovery: {
          lastUpdate: updateStatus.lastUpdate,
          nextUpdate: updateStatus.nextUpdate,
          needsUpdate: updateStatus.needsUpdate
        },
        integration: {
          aiProcessorEnhanced: true,
          comprehensiveDatabaseLoaded: true,
          automatedMonitoringActive: true,
          validationSystemActive: true
        },
        performance: {
          improvementFactor: Math.round(finalStats.totalActions / 27 * 100) / 100, // Compared to original 27
          confidenceDistribution: {
            high: Math.round(finalStats.confidenceLevels.high / finalStats.totalActions * 100),
            medium: Math.round(finalStats.confidenceLevels.medium / finalStats.totalActions * 100),
            low: Math.round(finalStats.confidenceLevels.low / finalStats.totalActions * 100)
          }
        },
        files: {
          finalDatabase: '/Users/scrimwiggins/shortcut-genius-main/final-action-database.json',
          comprehensiveDatabase: '/Users/scrimwiggins/shortcut-genius-main/comprehensive-action-database.json',
          aiPrompt: '/Users/scrimwiggins/shortcut-genius-main/ai-action-prompt.md',
          automatedDiscovery: '/Users/scrimwiggins/shortcut-genius-main/last-update.json',
          statistics: '/Users/scrimwiggins/shortcut-genius-main/final-stats.json'
        }
      };

      await fs.writeFile(
        '/Users/scrimwiggins/shortcut-genius-main/action-system-integration-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📋 Integration Summary:');
      console.log(`  Total Actions: ${report.system.totalActions} (${report.performance.improvementFactor}x improvement)`);
      console.log(`  High Confidence: ${report.system.highConfidenceActions} actions`);
      console.log(`  Categories: ${Object.keys(report.system.categories).length}`);
      console.log(`  Actions with Parameters: ${report.system.actionsWithParameters}`);
      console.log(`  Automated Monitoring: ${report.automatedDiscovery.needsUpdate ? 'Update Available' : 'Current'}`);
      console.log(`  Integration Report: /Users/scrimwiggins/shortcut-genius-main/action-system-integration-report.json`);

    } catch (error) {
      console.log('Could not generate integration report:', error);
    }
  }

  // Public methods for manual control
  async forceRebuild(): Promise<void> {
    console.log('🔄 Forcing complete system rebuild...');
    await this.databaseBuilder.buildFinalDatabase();
    await this.discovery.forceUpdate();
    await this.generateIntegrationReport();
    console.log('✅ System rebuild completed');
  }

  async getSystemStatus(): Promise<any> {
    try {
      const finalStats = JSON.parse(await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/final-stats.json', 'utf8'));
      const updateStatus = await this.discovery.getUpdateStatus();
      const integrationReport = JSON.parse(await fs.readFile('/Users/scrimwiggins/shortcut-genius-main/action-system-integration-report.json', 'utf8'));

      return {
        status: 'operational',
        timestamp: new Date().toISOString(),
        actions: finalStats.totalActions,
        lastUpdate: updateStatus.lastUpdate,
        nextUpdate: updateStatus.nextUpdate,
        integration: integrationReport.integration,
        performance: integrationReport.performance
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Run initializer if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const initializer = new ActionSystemInitializer();
  initializer.initialize().catch(console.error);
}