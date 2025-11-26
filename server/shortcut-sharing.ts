import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Shortcut } from '../client/src/lib/shortcuts';

interface SharedShortcut {
  id: string;
  name: string;
  description?: string;
  originalShortcut: Shortcut;
  filePath: string;
  signedFilePath?: string;
  shareUrl: string;
  qrCodeUrl: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
  author: string;
  version: string;
  hash: string;
}

interface SharingOptions {
  isPublic?: boolean;
  description?: string;
  tags?: string[];
  author?: string;
}

// Initialize directory paths
const SHARES_DIR = path.join(process.cwd(), 'shares');
const QR_CODES_DIR = path.join(SHARES_DIR, 'qr-codes');
const SHARES_DB = path.join(SHARES_DIR, 'shortcuts.json');

// Load shortcuts from file
async function loadShortcuts(): Promise<Map<string, SharedShortcut>> {
  try {
    if (await fs.access(SHARES_DB).then(() => true).catch(() => false)) {
      const data = await fs.readFile(SHARES_DB, 'utf-8');
      const shortcuts = JSON.parse(data);
      return new Map(Object.entries(shortcuts));
    }
  } catch (error) {
    console.log('No existing shortcuts database found, starting fresh');
  }
  return new Map();
}

// Save shortcuts to file
async function saveShortcuts(shortcuts: Map<string, SharedShortcut>): Promise<void> {
  try {
    const data = Object.fromEntries(shortcuts);
    await fs.writeFile(SHARES_DB, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save shortcuts database:', error);
  }
}

// In-memory cache with file persistence
let sharedShortcuts = new Map<string, SharedShortcut>();

// Initialize sharing system
export async function initializeSharingSystem(): Promise<void> {
  try {
    await fs.mkdir(SHARES_DIR, { recursive: true });
    await fs.mkdir(QR_CODES_DIR, { recursive: true });

    // Load existing shortcuts
    sharedShortcuts = await loadShortcuts();
    console.log(`Shortcut sharing system initialized with ${sharedShortcuts.size} existing shortcuts`);
  } catch (error) {
    console.error('Failed to initialize sharing system:', error);
    throw error;
  }
}

// Create a shareable shortcut
export async function createSharedShortcut(
  shortcut: Shortcut,
  fileBuffer: Buffer,
  signedFileBuffer?: Buffer,
  options: SharingOptions = {}
): Promise<SharedShortcut> {
  const id = uuidv4();
  const hash = crypto.createHash('sha256').update(JSON.stringify(shortcut)).digest('hex');

  // Create file paths
  const filename = `${sanitizeFilename(shortcut.name)}_${id.slice(0, 8)}`;
  const filePath = path.join(SHARES_DIR, `${filename}.shortcut`);
  const signedFilePath = signedFileBuffer
    ? path.join(SHARES_DIR, `${filename}_signed.shortcut`)
    : undefined;

  // Save shortcut files
  await fs.writeFile(filePath, fileBuffer);
  if (signedFileBuffer && signedFilePath) {
    await fs.writeFile(signedFilePath, signedFileBuffer);
  }

  // Generate URLs
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const shareUrl = `${baseUrl}/share/${id}`;
  const qrCodeUrl = `${baseUrl}/api/qr/${id}`;

  // Generate QR code
  const qrCodePath = path.join(QR_CODES_DIR, `${id}.png`);
  await QRCode.toFile(qrCodePath, shareUrl, {
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256
  });

  // Create shared shortcut object
  const sharedShortcut: SharedShortcut = {
    id,
    name: shortcut.name,
    description: options.description || `iOS Shortcut: ${shortcut.name}`,
    originalShortcut: shortcut,
    filePath,
    signedFilePath,
    shareUrl,
    qrCodeUrl,
    downloadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: options.isPublic ?? true,
    tags: options.tags || [],
    author: options.author || 'Anonymous',
    version: '1.0.0',
    hash
  };

  // Store in memory and save to file
  sharedShortcuts.set(id, sharedShortcut);
  await saveShortcuts(sharedShortcuts);

  return sharedShortcut;
}

// Get shared shortcut by ID
export async function getSharedShortcut(id: string): Promise<SharedShortcut | null> {
  return sharedShortcuts.get(id) || null;
}

// Get shortcut file buffer
export async function getShortcutFile(id: string, signed: boolean = false): Promise<Buffer | null> {
  const shared = await getSharedShortcut(id);
  if (!shared) return null;

  try {
    const filePath = signed && shared.signedFilePath ? shared.signedFilePath : shared.filePath;
    return await fs.readFile(filePath);
  } catch (error) {
    console.error(`Failed to read shortcut file for ${id}:`, error);
    return null;
  }
}

// Increment download count
export async function incrementDownloadCount(id: string): Promise<void> {
  const shared = sharedShortcuts.get(id);
  if (shared) {
    shared.downloadCount++;
    shared.updatedAt = new Date().toISOString();
    await saveShortcuts(sharedShortcuts);
  }
}

// Get QR code for shared shortcut
export async function getQRCode(id: string): Promise<Buffer | null> {
  const qrCodePath = path.join(QR_CODES_DIR, `${id}.png`);
  try {
    return await fs.readFile(qrCodePath);
  } catch (error) {
    return null;
  }
}

// List public shared shortcuts
export async function listPublicShortcuts(
  limit: number = 50,
  offset: number = 0
): Promise<{ shortcuts: SharedShortcut[]; total: number }> {
  const publicShortcuts = Array.from(sharedShortcuts.values())
    .filter(s => s.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);

  const total = Array.from(sharedShortcuts.values()).filter(s => s.isPublic).length;

  return { shortcuts: publicShortcuts, total };
}

// Search shared shortcuts
export async function searchShortcuts(
  query: string,
  tags?: string[],
  limit: number = 20
): Promise<SharedShortcut[]> {
  const normalizedQuery = query.toLowerCase();

  return Array.from(sharedShortcuts.values())
    .filter(s => s.isPublic)
    .filter(s => {
      const matchesQuery = !query ||
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.description?.toLowerCase().includes(normalizedQuery) ||
        s.author.toLowerCase().includes(normalizedQuery);

      const matchesTags = !tags?.length ||
        tags.some(tag => s.tags.includes(tag));

      return matchesQuery && matchesTags;
    })
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, limit);
}

// Delete shared shortcut
export async function deleteSharedShortcut(id: string): Promise<boolean> {
  const shared = await getSharedShortcut(id);
  if (!shared) return false;

  try {
    // Remove files
    await fs.unlink(shared.filePath);
    if (shared.signedFilePath) {
      await fs.unlink(shared.signedFilePath);
    }

    // Remove QR code
    const qrCodePath = path.join(QR_CODES_DIR, `${id}.png`);
    try {
      await fs.unlink(qrCodePath);
    } catch {
      // QR code might not exist
    }

    // Remove from memory
    sharedShortcuts.delete(id);

    return true;
  } catch (error) {
    console.error(`Failed to delete shared shortcut ${id}:`, error);
    return false;
  }
}

// Get sharing statistics
export async function getSharingStats(): Promise<{
  totalShortcuts: number;
  totalDownloads: number;
  publicShortcuts: number;
  recentShortcuts: SharedShortcut[];
}> {
  const allShortcuts = Array.from(sharedShortcuts.values());
  const totalDownloads = allShortcuts.reduce((sum, s) => sum + s.downloadCount, 0);
  const publicShortcuts = allShortcuts.filter(s => s.isPublic).length;
  const recentShortcuts = allShortcuts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalShortcuts: allShortcuts.length,
    totalDownloads,
    publicShortcuts,
    recentShortcuts
  };
}

// Utility function to sanitize filenames
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

// Generate sharing metadata
export function generateSharingMetadata(shared: SharedShortcut) {
  return {
    id: shared.id,
    name: shared.name,
    description: shared.description,
    shareUrl: shared.shareUrl,
    qrCodeUrl: shared.qrCodeUrl,
    downloadCount: shared.downloadCount,
    actionCount: shared.originalShortcut.actions.length,
    tags: shared.tags,
    author: shared.author,
    createdAt: shared.createdAt,
    version: shared.version,
    isSigned: !!shared.signedFilePath
  };
}