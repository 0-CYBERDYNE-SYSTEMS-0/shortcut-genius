import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Download,
  Eye,
  Calendar,
  User,
  Hash,
  Shield,
  ExternalLink,
  RefreshCw,
  Filter,
  TrendingUp
} from 'lucide-react';

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

interface GalleryStats {
  totalShortcuts: number;
  totalDownloads: number;
  publicShortcuts: number;
  recentShortcuts: SharedShortcut[];
}

interface ShortcutsGalleryProps {
  onImportShortcut?: (shortcutUrl: string) => void;
}

export function ShortcutsGallery({ onImportShortcut }: ShortcutsGalleryProps) {
  const [shortcuts, setShortcuts] = useState<SharedShortcut[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load shortcuts and stats in parallel
      const [shortcutsResponse, statsResponse] = await Promise.all([
        fetch('/api/shortcuts/public?limit=50'),
        fetch('/api/shortcuts/stats')
      ]);

      if (!shortcutsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load gallery data');
      }

      const shortcutsData = await shortcutsResponse.json();
      const statsData = await statsResponse.json();

      setShortcuts(shortcutsData.shortcuts);
      setStats(statsData);

      // Extract unique tags
      const tags = new Set<string>();
      shortcutsData.shortcuts.forEach((shortcut: SharedShortcut) => {
        shortcut.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const searchShortcuts = async () => {
    if (!searchQuery && selectedTags.length === 0) {
      loadGalleryData();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      params.set('limit', '50');

      const response = await fetch(`/api/shortcuts/search?${params}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setShortcuts(data.shortcuts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const downloadShortcut = (shortcut: SharedShortcut, signed: boolean = false) => {
    const url = `/api/shortcuts/download/${shortcut.id}${signed ? '?signed=true' : ''}`;
    window.open(url, '_blank');
  };

  const viewShortcut = (shortcut: SharedShortcut) => {
    window.open(`/share/${shortcut.id}`, '_blank');
  };

  const importShortcut = async (shortcut: SharedShortcut) => {
    if (onImportShortcut) {
      onImportShortcut(shortcut.shareUrl);
    }
  };

  if (loading && shortcuts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Shortcuts Gallery</h2>
            <p className="text-muted-foreground">
              Discover and share iOS shortcuts created by the community
            </p>
          </div>
          <Button onClick={loadGalleryData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.totalShortcuts}</p>
                  <p className="text-sm text-muted-foreground">Total Shortcuts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                  <p className="text-sm text-muted-foreground">Downloads</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.publicShortcuts}</p>
                  <p className="text-sm text-muted-foreground">Public</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{shortcuts.length}</p>
                  <p className="text-sm text-muted-foreground">Showing</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchShortcuts()}
              className="pl-10"
            />
          </div>
          <Button onClick={searchShortcuts} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Active filters:</span>
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" onClick={() => toggleTag(tag)} className="cursor-pointer">
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Shortcuts Grid */}
      {shortcuts.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {searchQuery || selectedTags.length > 0
                ? 'No shortcuts found matching your criteria'
                : 'No shortcuts available yet'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortcuts.map(shortcut => (
            <Card key={shortcut.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-2 flex items-center gap-2">
                      {shortcut.name}
                      {shortcut.isSigned && <Shield className="h-4 w-4 text-green-500" />}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {shortcut.description}
                    </CardDescription>
                  </div>
                  {shortcut.downloadCount > 10 && (
                    <Badge variant="secondary" className="ml-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {shortcut.actionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {shortcut.downloadCount}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {shortcut.author}
                  </span>
                </div>

                {/* Tags */}
                {shortcut.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shortcut.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {shortcut.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{shortcut.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadShortcut(shortcut)}
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>

                  <Button
                    onClick={() => viewShortcut(shortcut)}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => viewShortcut(shortcut)}
                    size="sm"
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {shortcut.isSigned && (
                  <Button
                    onClick={() => downloadShortcut(shortcut, true)}
                    size="sm"
                    variant="secondary"
                    className="w-full"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Download Signed
                  </Button>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(shortcut.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && shortcuts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
      )}
    </div>
  );
}