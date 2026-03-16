import React, { useState, useCallback } from 'react';

interface ShortcutData {
  shortcut_name: string;
  actions: any[];
  action_count: number;
  complexity_score: number;
  [key: string]: any;
}

interface UploadResult {
  success: boolean;
  imported: number;
  shortcuts: ShortcutData[];
  message: string;
}

interface KnowledgeBaseUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
}

export default function KnowledgeBaseUpload({ onUploadComplete }: KnowledgeBaseUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ShortcutData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setError(null);

        // Read and preview file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            
            if (Array.isArray(data)) {
              setPreview(data);
            } else if (data.shortcuts && Array.isArray(data.shortcuts)) {
              setPreview(data.shortcuts);
            } else if (data.success && data.shortcuts) {
              setPreview(data.shortcuts);
            } else {
              setError('Invalid JSON format. Expected array of shortcuts.');
            }
          } catch (err) {
            setError('Failed to parse JSON file');
          }
        };
        reader.readAsText(selectedFile);
      } else {
        setError('Please select a JSON file');
      }
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // Prepare shortcuts data
      let shortcuts: ShortcutData[];
      if (Array.isArray(data)) {
        shortcuts = data;
      } else if (data.shortcuts && Array.isArray(data.shortcuts)) {
        shortcuts = data.shortcuts;
      } else if (data.success && data.shortcuts) {
        shortcuts = data.shortcuts;
      } else {
        throw new Error('Invalid JSON format');
      }

      // Upload to API
      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shortcuts),
      });

      const result: UploadResult = await response.json();

      if (result.success && onUploadComplete) {
        onUploadComplete(result);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(false);
    }
  }, [file, onUploadComplete]);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
  }, []);

  return (
    <div className="kb-upload">
      <h2>Upload Shortcuts</h2>
      <p className="kb-upload-instructions">
        Upload your iOS Shortcuts exported with the ios-shortcuts tool:
        <code className="kb-code">ios-shortcuts export "Shortcut Name" --full</code>
      </p>

      <div className="kb-upload-dropzone">
        <input
          type="file"
          id="kb-file-input"
          accept=".json,application/json"
          onChange={handleFileSelect}
          disabled={uploading}
          className="kb-file-input"
        />
        <label htmlFor="kb-file-input" className="kb-file-label">
          {file ? (
            <div className="kb-file-selected">
              <span className="kb-file-icon">📄</span>
              <span className="kb-file-name">{file.name}</span>
              <span className="kb-file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <div className="kb-file-prompt">
              <span className="kb-upload-icon">📤</span>
              <span className="kb-upload-text">
                {uploading ? 'Uploading...' : 'Click to select or drag and drop'}
              </span>
            </div>
          )}
        </label>
      </div>

      {error && (
        <div className="kb-error">
          <span className="kb-error-icon">⚠️</span>
          <span className="kb-error-text">{error}</span>
        </div>
      )}

      {preview && !uploading && (
        <div className="kb-preview">
          <h3>Preview: {preview.length} shortcuts</h3>
          <div className="kb-preview-list">
            {preview.slice(0, 10).map((shortcut, index) => (
              <div key={index} className="kb-preview-item">
                <div className="kb-preview-name">{shortcut.shortcut_name}</div>
                <div className="kb-preview-meta">
                  <span className="kb-preview-actions">{shortcut.action_count} actions</span>
                  <span className="kb-preview-complexity">
                    Complexity: {shortcut.complexity_score}
                  </span>
                </div>
              </div>
            ))}
            {preview.length > 10 && (
              <div className="kb-preview-more">
                ...and {preview.length - 10} more shortcuts
              </div>
            )}
          </div>
          <div className="kb-preview-actions">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="kb-button kb-button-primary"
            >
              {uploading ? 'Uploading...' : 'Upload {preview.length} Shortcuts'}
            </button>
            <button
              onClick={clearFile}
              disabled={uploading}
              className="kb-button kb-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
