import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import type { Shortcut } from '../client/src/lib/shortcuts';
import { convertToPlist, generateShortcutMetadata } from './shortcut-builder';
import { checkSigningCapability, signShortcut } from './shortcut-signer';

const execFileAsync = promisify(execFile);

export interface DebugDiagnostic {
  id: string;
  createdAt: string;
  attempt: number | null;
  failureMode: 'import' | 'run' | 'wrong-output' | 'partial-success' | 'other';
  expectedOutcome?: string;
  note?: string;
  pastedPayload?: string;
  importedShortcut?: Shortcut;
  files: Array<{
    name: string;
    path: string;
    mimeType?: string;
    size: number;
  }>;
}

export interface DebugProposal {
  id: string;
  createdAt: string;
  model?: string;
  summary: string;
  recommendedChanges: string[];
  proposedShortcut: Shortcut;
  approvedAt?: string;
}

export interface DebugAttempt {
  attempt: number;
  createdAt: string;
  model?: string;
  shortcutHash: string;
  actionCount: number;
  signedAvailable: boolean;
  files: {
    unsignedPath: string;
    debugPath: string;
    signedPath?: string;
    manifestPath: string;
    instructionsPath: string;
    kitPath?: string;
  };
  manifest: Record<string, unknown>;
}

export interface DebugSession {
  id: string;
  sessionCode: string;
  ownerUserId: number;
  createdAt: string;
  updatedAt: string;
  model?: string;
  shortcutHash: string;
  shortcut: Shortcut;
  attempts: DebugAttempt[];
  diagnostics: DebugDiagnostic[];
  proposals: DebugProposal[];
  metadata: {
    conversationId?: number;
    promptSummary?: string;
  };
}

const DEBUG_DIR = path.join(process.cwd(), 'debug-sessions');
const DEBUG_DB = path.join(DEBUG_DIR, 'sessions.json');

let debugSessions = new Map<string, DebugSession>();

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'shortcut';
}

async function loadSessions(): Promise<Map<string, DebugSession>> {
  try {
    const content = await fs.readFile(DEBUG_DB, 'utf8');
    return new Map(Object.entries(JSON.parse(content)));
  } catch {
    return new Map();
  }
}

async function saveSessions(): Promise<void> {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  await fs.writeFile(DEBUG_DB, JSON.stringify(Object.fromEntries(debugSessions), null, 2));
}

function hashShortcut(shortcut: Shortcut): string {
  return crypto.createHash('sha256').update(JSON.stringify(shortcut)).digest('hex');
}

function makeSessionCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getSessionDir(sessionId: string): string {
  return path.join(DEBUG_DIR, sessionId);
}

export async function initializeDebugSessionStore(): Promise<void> {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  debugSessions = await loadSessions();
}

export async function createDebugSession(input: {
  shortcut: Shortcut;
  ownerUserId: number;
  model?: string;
  conversationId?: number;
  promptSummary?: string;
}): Promise<DebugSession> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const session: DebugSession = {
    id,
    sessionCode: makeSessionCode(),
    ownerUserId: input.ownerUserId,
    createdAt: now,
    updatedAt: now,
    model: input.model,
    shortcutHash: hashShortcut(input.shortcut),
    shortcut: input.shortcut,
    attempts: [],
    diagnostics: [],
    proposals: [],
    metadata: {
      conversationId: input.conversationId,
      promptSummary: input.promptSummary
    }
  };

  debugSessions.set(id, session);
  await fs.mkdir(getSessionDir(id), { recursive: true });
  await saveSessions();
  return session;
}

export function listDebugSessions(): DebugSession[] {
  return Array.from(debugSessions.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDebugSessionsForUser(ownerUserId: number): DebugSession[] {
  return listDebugSessions().filter((session) => session.ownerUserId === ownerUserId);
}

export function getDebugSession(sessionId: string): DebugSession | null {
  return debugSessions.get(sessionId) || null;
}

async function buildKitArchive(outputPath: string, files: string[]): Promise<boolean> {
  try {
    await execFileAsync('zip', ['-j', outputPath, ...files]);
    return true;
  } catch {
    // Zip is optional; the individual artifacts are still usable.
    return false;
  }
}

export async function createDebugAttempt(
  sessionId: string,
  input: {
    shortcut: Shortcut;
    model?: string;
    signMode?: 'anyone' | 'contacts-only';
  }
): Promise<DebugAttempt> {
  const session = getDebugSession(sessionId);
  if (!session) {
    throw new Error('Debug session not found');
  }

  const attempt = session.attempts.length + 1;
  const createdAt = new Date().toISOString();
  const sessionDir = getSessionDir(sessionId);
  const attemptDir = path.join(sessionDir, `attempt-${String(attempt).padStart(3, '0')}`);
  await fs.mkdir(attemptDir, { recursive: true });

  const basename = sanitizeFilename(input.shortcut.name || 'shortcut');
  const unsignedPath = path.join(attemptDir, `${basename}.shortcut`);
  const debugPath = path.join(attemptDir, `${basename}_debug.shortcut`);
  const signedInputPath = path.join(attemptDir, `${basename}_signed_input.shortcut`);
  const manifestPath = path.join(attemptDir, 'manifest.json');
  const instructionsPath = path.join(attemptDir, 'README.txt');
  const kitPath = path.join(attemptDir, `${basename}_debug_kit.zip`);

  const unsignedBuffer = convertToPlist(input.shortcut);
  const debugBuffer = convertToPlist(input.shortcut, { debug: true });
  await fs.writeFile(unsignedPath, unsignedBuffer);
  await fs.writeFile(debugPath, debugBuffer);

  let signedPath: string | undefined;
  const signingCapability = await checkSigningCapability();
  if (signingCapability.available) {
    await fs.writeFile(signedInputPath, unsignedBuffer);
    const signingResult = await signShortcut(signedInputPath, {
      mode: input.signMode || 'anyone',
      outputDir: attemptDir
    });

    if (signingResult.success && signingResult.signedFilePath) {
      signedPath = signingResult.signedFilePath;
    }
  }

  const shortcutMetadata = generateShortcutMetadata(input.shortcut);
  const manifest = {
    sessionId,
    sessionCode: session.sessionCode,
    attempt,
    model: input.model || session.model,
    shortcutHash: shortcutMetadata.hash,
    shortcutName: input.shortcut.name,
    actionCount: input.shortcut.actions.length,
    createdAt,
    files: {
      unsigned: path.basename(unsignedPath),
      debug: path.basename(debugPath),
      ...(signedPath ? { signed: path.basename(signedPath) } : {})
    }
  };

  const instructions = [
    `Shortcut Genius debug kit`,
    ``,
    `Session code: ${session.sessionCode}`,
    `Attempt: ${attempt}`,
    `Shortcut: ${input.shortcut.name}`,
    ``,
    `Recommended loop:`,
    `1. Install the signed shortcut when available.`,
    `2. If it fails, run the debug variant and copy any result text you see.`,
    `3. Return to Shortcut Genius and upload this kit, the debug payload, screenshots, or the failing .shortcut.`,
    `4. Review the AI fix proposal before approving the next attempt.`,
  ].join('\n');

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await fs.writeFile(instructionsPath, instructions);
  const kitCreated = await buildKitArchive(kitPath, [unsignedPath, debugPath, manifestPath, instructionsPath, ...(signedPath ? [signedPath] : [])]);

  const attemptRecord: DebugAttempt = {
    attempt,
    createdAt,
    model: input.model || session.model,
    shortcutHash: shortcutMetadata.hash,
    actionCount: input.shortcut.actions.length,
    signedAvailable: Boolean(signedPath),
    files: {
      unsignedPath,
      debugPath,
      signedPath,
      manifestPath,
      instructionsPath,
      kitPath: kitCreated ? kitPath : undefined
    },
    manifest
  };

  session.shortcut = input.shortcut;
  session.shortcutHash = shortcutMetadata.hash;
  session.updatedAt = createdAt;
  session.attempts.push(attemptRecord);
  debugSessions.set(sessionId, session);
  await saveSessions();
  return attemptRecord;
}

export async function addDebugDiagnostic(
  sessionId: string,
  diagnostic: Omit<DebugDiagnostic, 'id' | 'createdAt'> & { id?: string }
): Promise<DebugDiagnostic> {
  const session = getDebugSession(sessionId);
  if (!session) {
    throw new Error('Debug session not found');
  }

  const record: DebugDiagnostic = {
    id: diagnostic.id || uuidv4(),
    createdAt: new Date().toISOString(),
    ...diagnostic
  };

  session.diagnostics.unshift(record);
  session.updatedAt = record.createdAt;
  debugSessions.set(sessionId, session);
  await saveSessions();
  return record;
}

export async function saveDiagnosticFiles(
  sessionId: string,
  diagnosticId: string,
  files: Array<{ name: string; buffer: Buffer; mimeType?: string }>
): Promise<Array<{ name: string; path: string; mimeType?: string; size: number }>> {
  const dir = path.join(getSessionDir(sessionId), 'diagnostics', diagnosticId);
  await fs.mkdir(dir, { recursive: true });

  const saved = await Promise.all(files.map(async (file, index) => {
    const filePath = path.join(dir, `${String(index + 1).padStart(2, '0')}_${sanitizeFilename(file.name)}`);
    await fs.writeFile(filePath, file.buffer);
    return {
      name: file.name,
      path: filePath,
      mimeType: file.mimeType,
      size: file.buffer.length
    };
  }));

  return saved;
}

export function getAttemptFile(
  sessionId: string,
  attemptNumber: number,
  kind: 'unsigned' | 'debug' | 'signed' | 'manifest' | 'instructions' | 'kit'
): string | null {
  const session = getDebugSession(sessionId);
  const attempt = session?.attempts.find(entry => entry.attempt === attemptNumber);
  if (!attempt) {
    return null;
  }

  switch (kind) {
    case 'unsigned':
      return attempt.files.unsignedPath;
    case 'debug':
      return attempt.files.debugPath;
    case 'signed':
      return attempt.files.signedPath || null;
    case 'manifest':
      return attempt.files.manifestPath;
    case 'instructions':
      return attempt.files.instructionsPath;
    case 'kit':
      return attempt.files.kitPath || null;
    default:
      return null;
  }
}

export async function createDebugProposal(
  sessionId: string,
  proposal: Omit<DebugProposal, 'id' | 'createdAt'>
): Promise<DebugProposal> {
  const session = getDebugSession(sessionId);
  if (!session) {
    throw new Error('Debug session not found');
  }

  const record: DebugProposal = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...proposal
  };

  session.proposals.unshift(record);
  session.updatedAt = record.createdAt;
  debugSessions.set(sessionId, session);
  await saveSessions();
  return record;
}

export async function approveDebugProposal(sessionId: string, proposalId: string): Promise<DebugProposal> {
  const session = getDebugSession(sessionId);
  const proposal = session?.proposals.find(entry => entry.id === proposalId);
  if (!session || !proposal) {
    throw new Error('Debug proposal not found');
  }

  proposal.approvedAt = new Date().toISOString();
  session.updatedAt = proposal.approvedAt;
  debugSessions.set(sessionId, session);
  await saveSessions();
  return proposal;
}
