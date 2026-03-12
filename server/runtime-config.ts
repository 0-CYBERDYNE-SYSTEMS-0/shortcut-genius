import fs from 'fs/promises';
import path from 'path';

export const DEFAULT_PORT = 4321;
const DEFAULT_HOST = 'localhost';
const DEFAULT_LOCAL_DATA_DIR = path.join('.local', 'shortcut-genius');

export function getRequestedPort(): number {
  const rawPort = process.env.PORT;
  const parsedPort = Number(rawPort ?? DEFAULT_PORT);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return parsedPort;
}

export function getBaseUrl(): string {
  return process.env.BASE_URL || `http://${DEFAULT_HOST}:${getRequestedPort()}`;
}

export function requireBaseUrl(environment: string): string {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  if (environment !== 'development') {
    throw new Error('BASE_URL must be set outside development so generated public links do not point to localhost.');
  }

  return getBaseUrl();
}

export function getCodexRedirectUri(): string {
  return `${getBaseUrl()}/api/providers/oauth/codex/callback`;
}

export function getOpenRouterReferer(): string {
  return getBaseUrl();
}

export function getWorkspaceRoot(): string {
  return process.cwd();
}

export function getProjectPath(...segments: string[]): string {
  return path.join(getWorkspaceRoot(), ...segments);
}

export function getLocalDataDir(): string {
  const configuredDir = process.env.SHORTCUT_GENIUS_DATA_DIR || DEFAULT_LOCAL_DATA_DIR;
  return path.isAbsolute(configuredDir)
    ? configuredDir
    : getProjectPath(configuredDir);
}

export async function ensureLocalDataDir(): Promise<string> {
  const localDataDir = getLocalDataDir();
  await fs.mkdir(localDataDir, { recursive: true });
  return localDataDir;
}

export function getLocalDataPath(...segments: string[]): string {
  return path.join(getLocalDataDir(), ...segments);
}

export function getSharesDirectoryPath(): string {
  return getProjectPath('shares');
}

export function getActionDatabasePath(): string {
  return getProjectPath('action-database.json');
}

export function getComprehensiveActionDatabasePath(): string {
  return getProjectPath('comprehensive-action-database.json');
}

export function getEnhancedActionDatabasePath(): string {
  return getProjectPath('enhanced-action-database.json');
}

export function getFinalActionDatabasePath(): string {
  return getProjectPath('final-action-database.json');
}

export function getAiActionPromptPath(): string {
  return getProjectPath('ai-action-prompt.md');
}

export function getLastUpdatePath(): string {
  return getLocalDataPath('last-update.json');
}

export function getUpdateReportPath(): string {
  return getLocalDataPath('update-report.json');
}

export function getUpdateErrorPath(): string {
  return getLocalDataPath('update-error.json');
}

export function getDiscoveryStatsPath(): string {
  return getLocalDataPath('discovery-stats.json');
}

export function getComprehensiveStatsPath(): string {
  return getLocalDataPath('comprehensive-stats.json');
}

export function getFinalStatsPath(): string {
  return getLocalDataPath('final-stats.json');
}

export function getActionSystemIntegrationReportPath(): string {
  return getLocalDataPath('action-system-integration-report.json');
}
