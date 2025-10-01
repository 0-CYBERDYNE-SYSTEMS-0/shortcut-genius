import path from 'path';

const ROOT_DIR = process.cwd();

export const PATHS = {
  actionDatabase: path.join(ROOT_DIR, 'action-database.json'),
  comprehensiveActionDatabase: path.join(ROOT_DIR, 'comprehensive-action-database.json'),
  finalActionDatabase: path.join(ROOT_DIR, 'final-action-database.json'),
  enhancedActionDatabase: path.join(ROOT_DIR, 'enhanced-action-database.json'),
  aiActionPrompt: path.join(ROOT_DIR, 'ai-action-prompt.md'),
  lastUpdate: path.join(ROOT_DIR, 'last-update.json'),
  updateReport: path.join(ROOT_DIR, 'update-report.json'),
  updateError: path.join(ROOT_DIR, 'update-error.json'),
  finalStats: path.join(ROOT_DIR, 'final-stats.json'),
  discoveryStats: path.join(ROOT_DIR, 'discovery-stats.json'),
  comprehensiveStats: path.join(ROOT_DIR, 'comprehensive-stats.json'),
  actionSystemIntegrationReport: path.join(ROOT_DIR, 'action-system-integration-report.json'),
  sharesDir: path.join(ROOT_DIR, 'shares'),
} as const;
