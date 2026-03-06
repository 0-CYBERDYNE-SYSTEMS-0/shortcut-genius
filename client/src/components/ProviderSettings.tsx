import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ExternalLink, Key, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ProviderName = 'glm' | 'kimi' | 'minimax' | 'opencode' | 'codex';

interface ProviderStatus {
  connected: boolean;
  hasKey: boolean;
}

interface ProviderDef {
  id: ProviderName;
  label: string;
  description: string;
  keyPlaceholder: string;
  docsUrl: string;
  authType: 'apikey' | 'oauth';
  models: string[];
  tag?: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'glm',
    label: 'Zai / GLM',
    description: 'Zhipu AI — GLM-4.6, GLM-4.7. Unified reasoning + coding + agentic.',
    keyPlaceholder: 'z.ai API key',
    docsUrl: 'https://docs.z.ai/guides/overview/quick-start',
    authType: 'apikey',
    models: ['glm/glm-4.7', 'glm/glm-4.6', 'glm/glm-4.5'],
    tag: 'code',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    description: 'MiniMax M2 / M2.1 / M2.5 — large context, competitive for code.',
    keyPlaceholder: 'minimax.io API key',
    docsUrl: 'https://platform.minimax.io/docs/api-reference/text-chat',
    authType: 'apikey',
    models: ['minimax-direct/MiniMax-M2.5', 'minimax-direct/MiniMax-M2.1', 'minimax-direct/MiniMax-M2'],
    tag: 'code',
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    description: 'Kimi K2 & K2.5 — agentic coding, 256k context.',
    keyPlaceholder: 'moonshot.ai API key',
    docsUrl: 'https://platform.moonshot.ai/',
    authType: 'apikey',
    models: ['kimi/kimi-k2-5', 'kimi/kimi-k2-0711-preview'],
    tag: 'code',
  },
  {
    id: 'opencode',
    label: 'OpenCode Zen',
    description: 'OpenCode Zen gateway — curated coding models, OpenAI-compatible.',
    keyPlaceholder: 'OpenCode Zen API key',
    docsUrl: 'https://opencode.ai/zen',
    authType: 'apikey',
    models: ['opencode/default'],
    tag: 'sub',
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    description: 'ChatGPT Plus/Pro Codex via OAuth. No API key needed.',
    keyPlaceholder: '',
    docsUrl: 'https://developers.openai.com/codex/cli/',
    authType: 'oauth',
    models: ['codex/codex-1'],
  },
];

export function ProviderSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Record<ProviderName, ProviderStatus>>({
    glm:      { connected: false, hasKey: false },
    kimi:     { connected: false, hasKey: false },
    minimax:  { connected: false, hasKey: false },
    opencode: { connected: false, hasKey: false },
    codex:    { connected: false, hasKey: false },
  });
  const [keys, setKeys] = useState<Partial<Record<ProviderName, string>>>({});
  const [saving, setSaving] = useState<Partial<Record<ProviderName, boolean>>>({});
  const [testing, setTesting] = useState<Partial<Record<ProviderName, boolean>>>({});
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then(setStatus)
      .catch(console.error);
  }, []);

  async function saveKey(id: ProviderName) {
    const key = keys[id];
    if (!key?.trim()) return;
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(s => ({ ...s, [id]: { connected: true, hasKey: true } }));
        setKeys(k => ({ ...k, [id]: '' }));
        toast({ title: `${PROVIDERS.find(p => p.id === id)?.label} connected` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save key', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  async function testProvider(id: ProviderName) {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `${PROVIDERS.find(p => p.id === id)?.label} — connection OK` });
      } else {
        toast({ title: 'Connection failed', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setTesting(t => ({ ...t, [id]: false }));
    }
  }

  async function startCodexOAuth() {
    setOauthLoading(true);
    try {
      const res = await fetch('/api/providers/oauth/codex/start');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'width=500,height=700');
        toast({ title: 'Browser opened', description: 'Complete login, then return here.' });
        // Poll for connection
        const interval = setInterval(async () => {
          const r = await fetch('/api/providers');
          const s = await r.json();
          if (s.codex?.connected) {
            clearInterval(interval);
            setStatus(s);
            setOauthLoading(false);
            toast({ title: 'Codex connected via OAuth' });
          }
        }, 2000);
        setTimeout(() => { clearInterval(interval); setOauthLoading(false); }, 120_000);
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
      setOauthLoading(false);
    }
  }

  async function disconnect(id: ProviderName) {
    await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    setStatus(s => ({ ...s, [id]: { connected: false, hasKey: false } }));
    toast({ title: `${PROVIDERS.find(p => p.id === id)?.label} disconnected` });
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map(p => {
        const s = status[p.id];
        const isConnected = s?.connected || s?.hasKey;
        return (
          <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2.5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{p.label}</span>
                  {p.tag && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {p.tag === 'code' ? 'coding' : 'subscription'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Auth input */}
            {p.authType === 'apikey' ? (
              <div className="flex gap-1.5">
                <Input
                  type="password"
                  placeholder={isConnected ? '••••••••••••••••' : p.keyPlaceholder}
                  value={keys[p.id] || ''}
                  onChange={e => setKeys(k => ({ ...k, [p.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveKey(p.id)}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2.5 text-xs"
                  disabled={!keys[p.id]?.trim() || saving[p.id]}
                  onClick={() => saveKey(p.id)}
                >
                  {saving[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant={isConnected ? 'secondary' : 'default'}
                className="h-8 w-full text-xs"
                onClick={startCodexOAuth}
                disabled={oauthLoading}
              >
                {oauthLoading ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Waiting…</>
                ) : isConnected ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Reconnect OAuth</>
                ) : (
                  'Connect via OAuth'
                )}
              </Button>
            )}

            {/* Models + actions row */}
            {isConnected && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {p.models.slice(0, 2).map(m => (
                    <span key={m} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                      {m.split('/').pop()}
                    </span>
                  ))}
                  {p.models.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{p.models.length - 2}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    disabled={testing[p.id]}
                    onClick={() => testProvider(p.id)}
                  >
                    {testing[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                    onClick={() => disconnect(p.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
