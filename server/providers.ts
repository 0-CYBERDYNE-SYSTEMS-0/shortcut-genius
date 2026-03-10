import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getCodexRedirectUri } from './runtime-config';

const PROVIDERS_DIR = path.join(process.cwd(), '.local', 'shortcut-genius');
const PROVIDERS_FILE = path.join(PROVIDERS_DIR, 'providers.json');

export type ProviderName = 'glm' | 'kimi' | 'minimax' | 'opencode' | 'codex';

export interface ProviderConfig {
  apiKey?: string;
  oauthToken?: string;
  oauthRefreshToken?: string;
  oauthExpiry?: number;
  connected: boolean;
}

export interface ProvidersStore {
  glm: ProviderConfig;
  kimi: ProviderConfig;
  minimax: ProviderConfig;
  opencode: ProviderConfig;
  codex: ProviderConfig;
}

const defaults: ProvidersStore = {
  glm:      { connected: false },
  kimi:     { connected: false },
  minimax:  { connected: false },
  opencode: { connected: false },
  codex:    { connected: false },
};

export async function loadProviders(): Promise<ProvidersStore> {
  try {
    const data = await fs.readFile(PROVIDERS_FILE, 'utf8');
    return { ...defaults, ...JSON.parse(data) };
  } catch {
    return { ...defaults };
  }
}

async function saveProviders(store: ProvidersStore): Promise<void> {
  await fs.mkdir(PROVIDERS_DIR, { recursive: true });
  await fs.writeFile(PROVIDERS_FILE, JSON.stringify(store, null, 2));
}

export async function setProviderKey(name: ProviderName, apiKey: string): Promise<void> {
  const store = await loadProviders();
  store[name] = { ...store[name], apiKey, connected: true };
  await saveProviders(store);
}

export async function getProviderKey(name: ProviderName): Promise<string | undefined> {
  const store = await loadProviders();
  return store[name]?.apiKey;
}

export async function disconnectProvider(name: ProviderName): Promise<void> {
  const store = await loadProviders();
  store[name] = { connected: false };
  await saveProviders(store);
}

export async function getProvidersStatus(): Promise<Record<ProviderName, { connected: boolean; hasKey: boolean }>> {
  const store = await loadProviders();
  return {
    glm:      { connected: store.glm.connected,      hasKey: !!store.glm.apiKey || !!store.glm.oauthToken },
    kimi:     { connected: store.kimi.connected,     hasKey: !!store.kimi.apiKey },
    minimax:  { connected: store.minimax.connected,  hasKey: !!store.minimax.apiKey },
    opencode: { connected: store.opencode.connected, hasKey: !!store.opencode.apiKey },
    codex:    { connected: store.codex.connected,    hasKey: !!store.codex.oauthToken },
  };
}

// Provider base URLs
export const PROVIDER_URLS: Record<ProviderName, string> = {
  glm:      'https://api.z.ai/api/coding/paas/v4',
  kimi:     'https://api.moonshot.ai/v1',
  minimax:  'https://api.minimax.io/v1',
  opencode: 'https://opencode.ai/zen/v1',
  codex:    'https://api.openai.com/v1', // Uses OAuth token instead of API key
};

// Default model IDs per provider
export const PROVIDER_DEFAULT_MODELS: Record<ProviderName, string> = {
  glm:      'glm-4',
  kimi:     'kimi-k2-preview',
  minimax:  'MiniMax-M2.1',
  opencode: 'opencode-go/default',
  codex:    'codex-1',
};

// --- Codex OAuth PKCE ---

const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_AUTH_URL = 'https://auth.openai.com/oauth/authorize';
const CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token';

// In-memory PKCE verifier (one flow at a time is fine for a local app)
let pendingCodeVerifier: string | null = null;

export function startCodexOAuth(): { url: string } {
  const redirectUri = getCodexRedirectUri();
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  pendingCodeVerifier = verifier;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: crypto.randomBytes(16).toString('hex'),
  });

  return { url: `${CODEX_AUTH_URL}?${params}` };
}

export async function exchangeCodexToken(code: string): Promise<{ success: boolean; error?: string }> {
  if (!pendingCodeVerifier) {
    return { success: false, error: 'No pending OAuth flow. Start the flow again.' };
  }

  try {
    const redirectUri = getCodexRedirectUri();
    const res = await fetch(CODEX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CODEX_CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: pendingCodeVerifier,
      }),
    });

    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return { success: false, error: data.error_description || data.error || 'Token exchange failed' };
    }

    const store = await loadProviders();
    store.codex = {
      connected: true,
      oauthToken: data.access_token,
      oauthRefreshToken: data.refresh_token,
      oauthExpiry: Date.now() + (Number(data.expires_in) * 1000),
    };
    await saveProviders(store);
    pendingCodeVerifier = null;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getCodexToken(): Promise<string | undefined> {
  const store = await loadProviders();
  const { oauthToken, oauthExpiry } = store.codex;
  if (!oauthToken) return undefined;
  if (oauthExpiry && Date.now() > oauthExpiry - 300_000) return undefined; // expired
  return oauthToken;
}
