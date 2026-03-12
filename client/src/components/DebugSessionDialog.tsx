import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bug, Download, FileUp, FlaskConical, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Shortcut } from '@/lib/shortcuts';
import type { AIModel } from '@/lib/types';

type FailureMode = 'import' | 'run' | 'wrong-output' | 'partial-success' | 'other';

interface DebugProposal {
  id: string;
  createdAt: string;
  model?: string;
  summary: string;
  recommendedChanges: string[];
  proposedShortcut: Shortcut;
  approvedAt?: string;
}

interface DebugSessionResponse {
  id: string;
  sessionCode: string;
  createdAt: string;
  updatedAt: string;
  model?: string;
  attempts: Array<{
    attempt: number;
    createdAt: string;
    signedAvailable: boolean;
      downloads: {
        unsigned: string;
        debug: string;
        signed: string | null;
        manifest: string;
        instructions: string;
        kit: string | null;
      };
  }>;
  diagnostics: Array<{
    id: string;
    createdAt: string;
    attempt: number | null;
    failureMode: FailureMode;
    note?: string;
  }>;
  proposals: DebugProposal[];
}

interface DebugSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
  model: AIModel;
  onShortcutApply: (shortcut: Shortcut) => void;
}

const FAILURE_MODES: FailureMode[] = ['import', 'run', 'wrong-output', 'partial-success', 'other'];

export function DebugSessionDialog({
  open,
  onOpenChange,
  shortcut,
  model,
  onShortcutApply
}: DebugSessionDialogProps) {
  const [session, setSession] = useState<DebugSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failureMode, setFailureMode] = useState<FailureMode>('run');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [note, setNote] = useState('');
  const [pastedPayload, setPastedPayload] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
  }, [open]);

  const latestAttempt = useMemo(
    () => session?.attempts?.[session.attempts.length - 1] ?? null,
    [session]
  );

  const createSession = async () => {
    if (!shortcut) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut,
          model,
          promptSummary: `Manual debug loop for ${shortcut.name}`
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create debug session');
      }
      setSession(data.session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create debug session');
    } finally {
      setLoading(false);
    }
  };

  const createAttempt = async () => {
    if (!shortcut || !session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/debug-sessions/${session.id}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut, model, signMode: 'anyone' })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create debug build');
      }
      setSession(data.session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create debug build');
    } finally {
      setLoading(false);
    }
  };

  const uploadDiagnostics = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('failureMode', failureMode);
      if (latestAttempt) {
        formData.append('attempt', String(latestAttempt.attempt));
      }
      if (expectedOutcome) formData.append('expectedOutcome', expectedOutcome);
      if (note) formData.append('note', note);
      if (pastedPayload) formData.append('pastedPayload', pastedPayload);
      Array.from(files || []).forEach((file) => formData.append('files', file));

      const response = await fetch(`/api/debug-sessions/${session.id}/diagnostics`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to upload diagnostics');
      }

      setSession(data.session);
      setExpectedOutcome('');
      setNote('');
      setPastedPayload('');
      setFiles(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to upload diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const generateProposal = async () => {
    if (!session) return;

    setProposalLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/debug-sessions/${session.id}/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create proposal');
      }
      setSession(data.session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create proposal');
    } finally {
      setProposalLoading(false);
    }
  };

  const approveProposal = async (proposal: DebugProposal) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/debug-sessions/${session.id}/proposals/${proposal.id}/approve`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to approve proposal');
      }
      setSession(data.session);
      onShortcutApply(data.proposal.proposedShortcut);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to approve proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-accent-coral" />
            Debug Loop
          </DialogTitle>
          <DialogDescription>
            Create a session, download a signed + debug kit, bring back failures, and approve the next AI fix.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!session ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Start a debug session</CardTitle>
              <CardDescription>
                Snapshot the current shortcut and create a reusable session code for all future attempts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Current shortcut: <span className="font-medium text-foreground">{shortcut?.name || 'No shortcut loaded'}</span>
              </div>
              <Button onClick={createSession} disabled={!shortcut || loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                Create session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Session {session.sessionCode}</CardTitle>
                      <CardDescription>Debug history for local runs and returned artifacts.</CardDescription>
                    </div>
                    <Badge variant="outline">{session.attempts.length} attempts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={createAttempt} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Build next attempt
                    </Button>
                    {latestAttempt && (
                      <>
                        {latestAttempt.downloads.kit && (
                          <Button variant="secondary" asChild>
                            <a href={latestAttempt.downloads.kit}>
                              <Download className="mr-2 h-4 w-4" />
                              Download debug kit
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" asChild>
                          <a href={latestAttempt.downloads.debug}>
                            <Download className="mr-2 h-4 w-4" />
                            Debug variant
                          </a>
                        </Button>
                        {latestAttempt.downloads.signed && (
                          <Button variant="outline" asChild>
                            <a href={latestAttempt.downloads.signed}>
                              <Download className="mr-2 h-4 w-4" />
                              Signed
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    {session.attempts.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No attempts yet. Build the first signed + debug kit from this shortcut before sending it to a device.
                      </div>
                    ) : (
                      session.attempts.map((attempt) => (
                        <div key={attempt.attempt} className="rounded-xl border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold">Attempt {attempt.attempt}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(attempt.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{attempt.signedAvailable ? 'Signed ready' : 'Unsigned only'}</Badge>
                              <a href={attempt.downloads.manifest} className="text-accent-aqua text-xs font-medium">
                                manifest
                              </a>
                              <a href={attempt.downloads.instructions} className="text-accent-indigo text-xs font-medium">
                                instructions
                              </a>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Return diagnostics</CardTitle>
                  <CardDescription>
                    Paste copied debug output, drop the failing `.shortcut`, or attach screenshots and logs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {FAILURE_MODES.map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={failureMode === mode ? 'default' : 'secondary'}
                        onClick={() => setFailureMode(mode)}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedOutcome">What should have happened?</Label>
                    <Textarea
                      id="expectedOutcome"
                      value={expectedOutcome}
                      onChange={(event) => setExpectedOutcome(event.target.value)}
                      placeholder="Expected result, success state, or visible output."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">What actually happened?</Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Short human summary of the failure."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payload">Debug payload / copied result</Label>
                    <Textarea
                      id="payload"
                      value={pastedPayload}
                      onChange={(event) => setPastedPayload(event.target.value)}
                      placeholder="Paste copied Show Result output, console text, or any returned payload."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosticFiles">Artifacts</Label>
                    <Input
                      id="diagnosticFiles"
                      type="file"
                      multiple
                      accept=".shortcut,.json,.txt,.log,.png,.jpg,.jpeg,.heic"
                      onChange={(event) => setFiles(event.target.files)}
                    />
                  </div>

                  <Button onClick={uploadDiagnostics} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload diagnostics
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI fix proposal</CardTitle>
                  <CardDescription>
                    Generate a candidate repair from the session history, then apply it only after approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={generateProposal} disabled={!session || proposalLoading}>
                    {proposalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate proposal
                  </Button>

                  {session.proposals.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No proposal yet. Upload at least one returned failure and generate a fix candidate.
                    </div>
                  ) : (
                    session.proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {proposal.approvedAt ? 'Approved proposal' : 'Pending proposal'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(proposal.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant={proposal.approvedAt ? 'secondary' : 'outline'}>
                            {proposal.approvedAt ? 'Approved' : 'Awaiting approval'}
                          </Badge>
                        </div>

                        <p className="mt-3 text-sm text-muted-foreground">{proposal.summary}</p>

                        <div className="mt-3 space-y-2">
                          {proposal.recommendedChanges.map((change) => (
                            <div key={change} className="text-sm">
                              {change}
                            </div>
                          ))}
                        </div>

                        {!proposal.approvedAt && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button onClick={() => approveProposal(proposal)}>
                              <FileUp className="mr-2 h-4 w-4" />
                              Approve and apply
                            </Button>
                            <Button variant="secondary" onClick={() => onShortcutApply(proposal.proposedShortcut)}>
                              Preview in editor
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent returns</CardTitle>
                  <CardDescription>Human feedback and uploaded failures attached to this session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.diagnostics.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No diagnostics uploaded yet.
                    </div>
                  ) : (
                    session.diagnostics.map((diagnostic) => (
                      <div key={diagnostic.id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">{diagnostic.failureMode}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(diagnostic.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {diagnostic.note && (
                          <p className="mt-2 text-sm text-muted-foreground">{diagnostic.note}</p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
