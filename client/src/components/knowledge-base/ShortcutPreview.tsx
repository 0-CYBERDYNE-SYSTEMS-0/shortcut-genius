import React from 'react';

interface ShortcutData {
  id?: number;
  shortcut_name: string;
  actions: any[];
  action_count: number;
  complexity_score: number;
  run_count: number;
  third_party_integrations?: any[];
  tags?: string[];
  is_example?: boolean;
  quality_score?: number;
}

interface ShortcutPreviewProps {
  shortcut: ShortcutData;
  onFlag?: (id: number, isExample: boolean, quality?: number) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export default function ShortcutPreview({
  shortcut,
  onFlag,
  onDelete,
  compact = false
}: ShortcutPreviewProps) {
  const getComplexityLabel = (score: number): string => {
    if (score < 10) return 'Simple';
    if (score < 30) return 'Medium';
    return 'Complex';
  };

  const getComplexityColor = (score: number): string => {
    if (score < 10) return 'complexity-simple';
    if (score < 30) return 'complexity-medium';
    return 'complexity-complex';
  };

  const getActionPreview = (): string => {
    if (!shortcut.actions || shortcut.actions.length === 0) {
      return 'No actions';
    }

    const actionTypes = shortcut.actions.slice(0, 3).map(action => {
      const identifier = action.identifier || action.WFWorkflowActionIdentifier || 'unknown';
      // Extract readable action name
      const parts = identifier.split('.');
      const lastPart = parts[parts.length - 1];
      return lastPart.replace(/([A-Z])/g, ' $1').trim() || identifier;
    });

    return actionTypes.join(' → ') + (shortcut.actions.length > 3 ? ' ...' : '');
  };

  const getThirdPartyApps = (): string[] => {
    if (!shortcut.third_party_integrations) return [];
    return shortcut.third_party_integrations
      .filter(app => app && typeof app === 'string' && app !== '')
      .map(app => {
        const parts = app.split('.');
        return parts[parts.length - 1] || app;
      });
  };

  const thirdPartyApps = getThirdPartyApps();

  if (compact) {
    return (
      <div className={`shortcut-preview shortcut-preview-compact`}>
        <div className="sp-header">
          <h4 className="sp-name">{shortcut.shortcut_name}</h4>
          <div className="sp-complexity">
            <span className={`sp-complexity-badge ${getComplexityColor(shortcut.complexity_score)}`}>
              {getComplexityLabel(shortcut.complexity_score)}
            </span>
          </div>
        </div>
        <div className="sp-stats">
          <span className="sp-stat" title="Actions">🔧 {shortcut.action_count}</span>
          <span className="sp-stat" title="Runs">🏃 {shortcut.run_count}</span>
          {thirdPartyApps.length > 0 && (
            <span className="sp-stat" title="Third-party apps">
              🧩 {thirdPartyApps.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shortcut-preview">
      <div className="sp-header">
        <div className="sp-header-left">
          <h4 className="sp-name">{shortcut.shortcut_name}</h4>
          {shortcut.is_example && (
            <span className="sp-badge sp-badge-example">⭐ Example</span>
          )}
          {shortcut.quality_score && (
            <span className="sp-badge sp-badge-quality">
              ⭐ {shortcut.quality_score}/10
            </span>
          )}
        </div>
        <div className="sp-actions">
          {onFlag && shortcut.id && (
            <button
              onClick={() => onFlag(shortcut.id, !shortcut.is_example)}
              className="sp-button sp-button-flag"
              title={shortcut.is_example ? 'Unmark as example' : 'Mark as example'}
            >
              {shortcut.is_example ? '⭐' : '☆'}
            </button>
          )}
          {onDelete && shortcut.id && (
            <button
              onClick={() => onDelete(shortcut.id)}
              className="sp-button sp-button-delete"
              title="Delete shortcut"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="sp-body">
        <div className="sp-complexity">
          <label>Complexity:</label>
          <div className="sp-complexity-bar">
            <div
              className="sp-complexity-fill"
              style={{ width: `${Math.min(100, shortcut.complexity_score)}%` }}
            />
          </div>
          <span className={`sp-complexity-badge ${getComplexityColor(shortcut.complexity_score)}`}>
            {getComplexityLabel(shortcut.complexity_score)}
          </span>
        </div>

        <div className="sp-stats">
          <div className="sp-stat-item">
            <span className="sp-stat-label">Actions:</span>
            <span className="sp-stat-value">{shortcut.action_count}</span>
          </div>
          <div className="sp-stat-item">
            <span className="sp-stat-label">Runs:</span>
            <span className="sp-stat-value">{shortcut.run_count}</span>
          </div>
        </div>

        {thirdPartyApps.length > 0 && (
          <div className="sp-integrations">
            <label>Integrations:</label>
            <div className="sp-tags">
              {thirdPartyApps.map((app, index) => (
                <span key={index} className="sp-tag">
                  {app}
                </span>
              ))}
            </div>
          </div>
        )}

        {shortcut.tags && shortcut.tags.length > 0 && (
          <div className="sp-tags">
            <label>Tags:</label>
            <div className="sp-tags">
              {shortcut.tags.map((tag, index) => (
                <span key={index} className="sp-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sp-actions-preview">
        <label>Action Flow:</label>
        <code className="sp-actions-code">
          {getActionPreview()}
        </code>
      </div>
    </div>
  );
}
