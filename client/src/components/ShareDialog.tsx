import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Share2,
  Download,
  QrCode,
  Copy,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertCircle,
  Upload,
  Users,
  Eye,
  Globe
} from 'lucide-react';
import { Shortcut } from '@/lib/shortcuts';

interface SharedShortcut {
  id: string;
  name: string;
  description: string;
  shareUrl: string;
  qrCodeUrl: string;
  downloadCount: number;
  actionCount: number;
  tags: string[];
  author: string;
  createdAt: string;
  version: string;
  isSigned: boolean;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
}

export function ShareDialog({ open, onOpenChange, shortcut }: ShareDialogProps) {
  const [step, setStep] = useState<'options' | 'sharing' | 'complete'>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Sharing options
  const [isPublic, setIsPublic] = useState(true);
  const [signFile, setSignFile] = useState(false);
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('Anonymous');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Results
  const [sharedShortcut, setSharedShortcut] = useState<SharedShortcut | null>(null);
  const [signingCapability, setSigningCapability] = useState<any>(null);

  // Initialize form when shortcut changes
  useEffect(() => {
    if (shortcut && open) {
      setDescription(`iOS Shortcut: ${shortcut.name}`);
      setStep('options');
      setError(null);
      setSharedShortcut(null);

      // Check signing capability
      fetchSigningCapability();
    }
  }, [shortcut, open]);

  const fetchSigningCapability = async () => {
    try {
      const response = await fetch('/api/shortcuts/signing-info');
      const data = await response.json();
      setSigningCapability(data);
    } catch (err) {
      console.error('Failed to fetch signing capability:', err);
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const shareShortcut = async () => {
    if (!shortcut) return;

    setLoading(true);
    setError(null);
    setStep('sharing');
    setProgress(20);

    try {
      const response = await fetch('/api/shortcuts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut,
          signFile,
          isPublic,
          description,
          tags,
          author
        })
      });

      setProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share shortcut');
      }

      const shared = await response.json();
      setSharedShortcut(shared);
      setProgress(100);
      setStep('complete');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStep('options');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Shortcut
          </DialogTitle>
        </DialogHeader>

        {step === 'options' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this shortcut does..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name or handle"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1"
                  />
                  <Button onClick={addTag} size="sm">Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Privacy & Visibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="public-switch">Make Public</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to discover this shortcut
                    </p>
                  </div>
                  <Switch
                    id="public-switch"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {isPublic ? (
                    <>
                      <Globe className="h-4 w-4 text-green-500" />
                      <span>Public - Anyone can view and download</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 text-orange-500" />
                      <span>Private - Only people with the link can access</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signing Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Code Signing
                </CardTitle>
                <CardDescription>
                  Sign your shortcut for enhanced security and trust
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signingCapability && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="sign-switch">Sign Shortcut</Label>
                        <p className="text-sm text-muted-foreground">
                          {signingCapability.available
                            ? 'Create a signed version for iOS 15+'
                            : 'Signing not available on this platform'
                          }
                        </p>
                      </div>
                      <Switch
                        id="sign-switch"
                        checked={signFile}
                        onCheckedChange={setSignFile}
                        disabled={!signingCapability.available}
                      />
                    </div>

                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        {signingCapability.available ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="font-medium">
                          Signing {signingCapability.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Platform: {signingCapability.platform} |
                        Capabilities: {signingCapability.capabilities?.join(', ') || 'Limited'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={shareShortcut} className="flex-1" disabled={!shortcut}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Shortcut
              </Button>
            </div>
          </div>
        )}

        {step === 'sharing' && (
          <div className="space-y-6 text-center py-8">
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-blue-500 animate-bounce" />
              <h3 className="text-lg font-semibold">Creating Shareable Link...</h3>
              <Progress value={progress} className="w-full" />
              <div className="space-y-2 text-sm text-muted-foreground">
                {progress < 40 && <p>Building shortcut file...</p>}
                {progress >= 40 && progress < 80 && signFile && <p>Signing shortcut...</p>}
                {progress >= 60 && <p>Uploading and creating share link...</p>}
                {progress >= 90 && <p>Finalizing...</p>}
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && sharedShortcut && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold">Shortcut Shared Successfully!</h3>
              <p className="text-muted-foreground">
                Your shortcut is now available for download and sharing
              </p>
            </div>

            <Tabs defaultValue="share" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="share">Share</TabsTrigger>
                <TabsTrigger value="download">Download</TabsTrigger>
                <TabsTrigger value="stats">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="share" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Share Link</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={sharedShortcut.shareUrl} readOnly className="flex-1" />
                      <Button size="sm" onClick={() => copyToClipboard(sharedShortcut.shareUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => openInNewTab(sharedShortcut.shareUrl)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">QR Code</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <img
                      src={sharedShortcut.qrCodeUrl}
                      alt="QR Code"
                      className="mx-auto w-48 h-48 border rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Scan with iPhone to open directly in Shortcuts app
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="download" className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Regular Download</h4>
                          <p className="text-sm text-muted-foreground">Standard .shortcut file</p>
                        </div>
                        <Button
                          onClick={() => openInNewTab(`/api/shortcuts/download/${sharedShortcut.id}`)}
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {sharedShortcut.isSigned && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              Signed Download
                              <Shield className="h-4 w-4 text-green-500" />
                            </h4>
                            <p className="text-sm text-muted-foreground">For iOS 15+ devices</p>
                          </div>
                          <Button
                            onClick={() => openInNewTab(`/api/shortcuts/download/${sharedShortcut.id}?signed=true`)}
                            size="sm"
                            variant="secondary"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Signed
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <p className="text-2xl font-bold">{sharedShortcut.actionCount}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Downloads</Label>
                    <p className="text-2xl font-bold">{sharedShortcut.downloadCount}</p>
                  </div>
                </div>

                {sharedShortcut.tags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {sharedShortcut.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sharedShortcut.createdAt).toLocaleString()}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}