import React, { useState, useEffect, useCallback } from 'react';

interface ShortcutData {
  id: number;
  shortcut_name: string;
  action_count: number;
  complexity_score: number;
  run_count: number;
  third_party_integrations: any[];
  tags: string[];
  is_example: boolean;
  quality_score: number | null;
  created_at: Date;
}

interface StatsData {
  total_shortcuts: number;
  total_actions: number;
  example_count: number;
  complexity_distribution: Record<string, number>;
  third_party_apps: Array<{ app: string; count: number }>;
}

interface KnowledgeBaseTabProps {
  // No props needed - fetches from API
}

export default function KnowledgeBaseTab({ }: KnowledgeBaseTabProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState<{
    tags: string[];
    complexity_min: number | undefined;
    complexity_max: number | undefined;
    is_example: boolean | undefined;
  }>({
    tags: [],
    complexity_min: undefined,
    complexity_max: undefined,
    is_example: undefined
  });

  const fetchKnowledgeBase = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch shortcuts
      const shortcutsResponse = await fetch('/api/knowledge-base' + 
        (filters.tags.length > 0 ? `?tags=${filters.tags.join(',')}` : '') +
        (filters.complexity_min !== undefined ? `&complexity_min=${filters.complexity_min}` : '') +
        (filters.complexity_max !== undefined ? `&complexity_max=${filters.complexity_max}` : '') +
        (filters.is_example !== undefined ? `&is_example=${filters.is_example}` : '')
      );

      const shortcutsData = await shortcutsResponse.json();
      setShortcuts(shortcutsData.shortcuts || []);

      // Fetch stats
      const statsResponse = await fetch('/api/knowledge-base/stats');
      const statsData = await statsResponse.json();
      setStats(statsData.stats);
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchKnowledgeBase();
  }, [fetchKnowledgeBase]);

  const handleUploadComplete = useCallback((result: any) => {
    setShowUpload(false);
    fetchKnowledgeBase();
  }, [fetchKnowledgeBase]);

  const handleFlagShortcut = useCallback(async (id: number, isExample: boolean, quality?: number) => {
    try {
      await fetch(`/api/knowledge-base/${id}/flag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_example: isExample, quality_score: quality }),
      });

      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to flag shortcut:', err);
    }
  }, [fetchKnowledgeBase]);

  const handleDeleteShortcut = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this shortcut from your knowledge base?')) {
      return;
    }

    try {
      await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });

      fetchKnowledgeBase();
    } catch (err) {
      console.error('Failed to delete shortcut:', err);
    }
  }, [fetchKnowledgeBase]);

  const clearFilters = useCallback(() => {
    setFilters({
      tags: [],
      complexity_min: undefined,
      complexity_max: undefined,
      is_example: undefined
    });
  }, []);

  if (showUpload) {
    const KnowledgeBaseUpload = require('./KnowledgeBaseUpload').default;
    return <KnowledgeBaseUpload onUploadComplete={handleUploadComplete} />;
  }

  if (loading) {
    return (
      <div className="kb-tab kb-loading">
        <div className="kb-spinner">Loading...</div>
      </div>
    );
  }

  const activeFilterCount = [
    filters.tags.length > 0 ? 'Tags' : null,
    filters.complexity_min !== undefined ? 'Min Complexity' : null,
    filters.complexity_max !== undefined ? 'Max Complexity' : null,
    filters.is_example !== undefined ? 'Example Only' : null
  ].filter(Boolean).length;

  return (
    <div className="kb-tab">
      <div className="kb-header">
        <h1>Knowledge Base</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="kb-button kb-button-primary"
        >
          + Upload Shortcuts
        </button>
      </div>

      {stats && (
        <div className="kb-stats">
          <h2>Overview</h2>
          <div className="kb-stats-grid">
            <div className="kb-stat-card">
              <div className="kb-stat-value">{stats.total_shortcuts}</div>
              <div className="kb-stat-label">Total Shortcuts</div>
            </div>
            <div className="kb-stat-card">
              <div className="kb-stat-value">{stats.total_actions}</div>
              <div className="kb-stat-label">Total Actions</div>
            </div>
            <div className="kb-stat-card">
              <div className="kb-stat-value">{stats.example_count}</div>
              <div className="kb-stat-label">Examples</div>
            </div>
          </div>

          <div className="kb-stats-distribution">
            <h3>Complexity Distribution</h3>
            <div className="kb-distribution">
              {Object.entries(stats.complexity_distribution).map(([category, count]) => (
                <div key={category} className="kb-dist-item">
                  <div className="kb-dist-category">{category}</div>
                  <div className="kb-dist-bar">
                    <div
                      className="kb-dist-fill"
                      style={{ width: `${(count / stats.total_shortcuts) * 100}%` }}
                    />
                  </div>
                  <div className="kb-dist-count">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {stats.third_party_apps && stats.third_party_apps.length > 0 && (
            <div className="kb-stats-apps">
              <h3>Top Third-Party Apps</h3>
              <div className="kb-apps-list">
                {stats.third_party_apps.slice(0, 10).map((item, index) => (
                  <div key={index} className="kb-app-item">
                    <div className="kb-app-name">{item.app}</div>
                    <div className="kb-app-count">{item.count} shortcuts</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="kb-filters">
        <h2>Filters</h2>
        <div className="kb-filter-group">
          <div className="kb-filter-item">
            <label>Complexity:</label>
            <select
              className="kb-filter-select"
              value={filters.complexity_min !== undefined ? filters.complexity_min : ''}
              onChange={(e) => setFilters(prev => ({ ...prev, complexity_min: e.target.value ? parseInt(e.target.value) : undefined }))}
            >
              <option value="">All</option>
              <option value="0">Simple (1-10)</option>
              <option value="10">Medium (10-30)</option>
              <option value="30">Complex (30+)</option>
            </select>
          </div>

          <div className="kb-filter-item">
            <label>
              <input
                type="checkbox"
                checked={filters.is_example === true}
                onChange={(e) => setFilters(prev => ({ ...prev, is_example: e.target.checked ? true : undefined }))}
              />
              Examples Only
            </label>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="kb-button kb-button-secondary">
              Clear Filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div className="kb-shortcuts">
        <h2>Your Shortcuts ({shortcuts.length})</h2>
        {shortcuts.length === 0 ? (
          <div className="kb-empty">
            <div className="kb-empty-icon">📄</div>
            <div className="kb-empty-text">
              No shortcuts in your knowledge base.
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="kb-button kb-button-primary"
            >
              Upload Your Shortcuts
            </button>
          </div>
        ) : (
          <div className="kb-shortcuts-list">
            {shortcuts.map(shortcut => {
              const ShortcutPreview = require('./ShortcutPreview').default;
              return (
                <ShortcutPreview
                  key={shortcut.id}
                  shortcut={shortcut}
                  onFlag={handleFlagShortcut}
                  onDelete={handleDeleteShortcut}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
