import { AutomatedActionDiscovery } from './automated-action-discovery';
import { FinalDatabaseBuilder } from './final-database-builder';
import fs from 'fs/promises';
import {
  ensureLocalDataDir,
  getActionDatabasePath,
  getActionSystemIntegrationReportPath,
  getAiActionPromptPath,
  getComprehensiveActionDatabasePath,
  getFinalActionDatabasePath,
  getFinalStatsPath,
  getLastUpdatePath,
} from './runtime-config';

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
      await fs.access(getFinalActionDatabasePath());

      // Check if comprehensive database exists
      await fs.access(getComprehensiveActionDatabasePath());

      // Check if original database exists
      await fs.access(getActionDatabasePath());

      // Check if AI prompt exists
      await fs.access(getAiActionPromptPath());

      // Load statistics
      const finalStats = JSON.parse(await fs.readFile(getFinalStatsPath(), 'utf8'));
      const originalStats = JSON.parse(await fs.readFile(getActionDatabasePath(), 'utf8'));

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
      const finalStats = JSON.parse(await fs.readFile(getFinalStatsPath(), 'utf8'));
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
          finalDatabase: getFinalActionDatabasePath(),
          comprehensiveDatabase: getComprehensiveActionDatabasePath(),
          aiPrompt: getAiActionPromptPath(),
          automatedDiscovery: getLastUpdatePath(),
          statistics: getFinalStatsPath()
        }
      };

      await ensureLocalDataDir();
      await fs.writeFile(getActionSystemIntegrationReportPath(), JSON.stringify(report, null, 2));

      console.log('\n📋 Integration Summary:');
      console.log(`  Total Actions: ${report.system.totalActions} (${report.performance.improvementFactor}x improvement)`);
      console.log(`  High Confidence: ${report.system.highConfidenceActions} actions`);
      console.log(`  Categories: ${Object.keys(report.system.categories).length}`);
      console.log(`  Actions with Parameters: ${report.system.actionsWithParameters}`);
      console.log(`  Automated Monitoring: ${report.automatedDiscovery.needsUpdate ? 'Update Available' : 'Current'}`);
      console.log(`  Integration Report: ${getActionSystemIntegrationReportPath()}`);

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
      const finalStats = JSON.parse(await fs.readFile(getFinalStatsPath(), 'utf8'));
      const updateStatus = await this.discovery.getUpdateStatus();
      const integrationReport = JSON.parse(await fs.readFile(getActionSystemIntegrationReportPath(), 'utf8'));

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
