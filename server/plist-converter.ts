import plist from 'plist';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface AppleShortcutAction {
  WFWorkflowActionIdentifier: string;
  WFWorkflowActionParameters: Record<string, any>;
}

export interface AppleShortcut {
  WFWorkflowName: string;
  WFWorkflowIcon: {
    WFWorkflowIconStartColor: number;
    WFWorkflowIconGlyphNumber: number;
  };
  WFWorkflowClientVersion: string;
  WFWorkflowClientRelease: string;
  WFWorkflowMinimumClientVersion: number;
  WFWorkflowMinimumClientVersionString?: string;
  WFWorkflowImportQuestions: any[];
  WFWorkflowTypes: string[];
  WFWorkflowInputContentItemClasses: string[];
  WFWorkflowActions: AppleShortcutAction[];
  WFWorkflowHasOutputFallback?: boolean;
  WFWorkflowNoInputBehavior?: {
    Name: string;
    Parameters?: Record<string, any>;
  };
}

export interface InternalAction {
  type: string;
  identifier: string;
  parameters: Record<string, any>;
  uuid?: string;
  groupingIdentifier?: string;
}

export interface InternalShortcut {
  name: string;
  description?: string;
  icon?: {
    color: number;
    glyph: number;
  };
  actions: InternalAction[];
  inputTypes?: string[];
  outputTypes?: string[];
}

export async function parsePlistFile(filePath: string): Promise<AppleShortcut> {
  const buffer = await fs.readFile(filePath);
  return parsePlistBuffer(buffer);
}

export function parsePlistBuffer(buffer: Buffer): AppleShortcut {
  const content = buffer.toString();
  
  if (content.startsWith('<?xml') || content.startsWith('<plist') || content.includes('<dict>')) {
    return plist.parse(content) as unknown as AppleShortcut;
  }
  
  if (process.platform === 'darwin') {
    try {
      const tempIn = `/tmp/shortcut_${uuidv4()}.shortcut`;
      const tempOut = `/tmp/shortcut_${uuidv4()}.json`;
      
      require('fs').writeFileSync(tempIn, buffer);
      execSync(`plutil -convert json -o "${tempOut}" "${tempIn}"`, { stdio: 'pipe' });
      
      const jsonContent = require('fs').readFileSync(tempOut, 'utf8');
      require('fs').unlinkSync(tempIn);
      require('fs').unlinkSync(tempOut);
      
      return JSON.parse(jsonContent) as AppleShortcut;
    } catch (error) {
      console.error('Binary plist conversion failed:', error);
    }
  }
  
  try {
    return JSON.parse(content) as AppleShortcut;
  } catch {
    throw new Error('Unable to parse file. Binary plist conversion requires macOS.');
  }
}

export function appleToInternal(apple: AppleShortcut): InternalShortcut {
  return {
    name: apple.WFWorkflowName || 'Untitled Shortcut',
    description: '',
    icon: apple.WFWorkflowIcon ? {
      color: apple.WFWorkflowIcon.WFWorkflowIconStartColor,
      glyph: apple.WFWorkflowIcon.WFWorkflowIconGlyphNumber
    } : undefined,
    actions: apple.WFWorkflowActions.map(action => ({
      type: extractActionType(action.WFWorkflowActionIdentifier),
      identifier: action.WFWorkflowActionIdentifier,
      parameters: action.WFWorkflowActionParameters || {},
      uuid: action.WFWorkflowActionParameters?.UUID,
      groupingIdentifier: action.WFWorkflowActionParameters?.GroupingIdentifier
    })),
    inputTypes: apple.WFWorkflowInputContentItemClasses,
    outputTypes: []
  };
}

export function internalToApple(internal: InternalShortcut): AppleShortcut {
  return {
    WFWorkflowName: internal.name,
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: internal.icon?.color || 4282601983,
      WFWorkflowIconGlyphNumber: internal.icon?.glyph || 59511
    },
    WFWorkflowClientVersion: '2605.0.5',
    WFWorkflowClientRelease: '2.2.2',
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: '900',
    WFWorkflowImportQuestions: [],
    WFWorkflowTypes: ['NCWidget', 'WatchKit', 'ActionExtension'],
    WFWorkflowInputContentItemClasses: internal.inputTypes || [
      'WFAppStoreAppContentItem',
      'WFArticleContentItem',
      'WFContactContentItem',
      'WFDateContentItem',
      'WFEmailAddressContentItem',
      'WFGenericFileContentItem',
      'WFImageContentItem',
      'WFiTunesProductContentItem',
      'WFLocationContentItem',
      'WFDCMapsLinkContentItem',
      'WFAVAssetContentItem',
      'WFPDFContentItem',
      'WFPhoneNumberContentItem',
      'WFRichTextContentItem',
      'WFSafariWebPageContentItem',
      'WFStringContentItem',
      'WFURLContentItem'
    ],
    WFWorkflowActions: internal.actions.map(action => ({
      WFWorkflowActionIdentifier: action.identifier || `is.workflow.actions.${action.type}`,
      WFWorkflowActionParameters: {
        ...action.parameters,
        UUID: action.uuid || uuidv4(),
        ...(action.groupingIdentifier ? { GroupingIdentifier: action.groupingIdentifier } : {})
      }
    })),
    WFWorkflowHasOutputFallback: false
  };
}

export function toXMLPlist(shortcut: AppleShortcut): string {
  return plist.build(shortcut as unknown as plist.PlistValue);
}

export async function toBinaryPlist(shortcut: AppleShortcut): Promise<Buffer> {
  const xmlPlist = plist.build(shortcut as unknown as plist.PlistValue);
  
  if (process.platform !== 'darwin') {
    console.warn('Binary plist conversion requires macOS. Returning XML plist.');
    return Buffer.from(xmlPlist, 'utf8');
  }
  
  const tempIn = `/tmp/shortcut_${uuidv4()}.plist`;
  const tempOut = `/tmp/shortcut_${uuidv4()}.shortcut`;
  
  await fs.writeFile(tempIn, xmlPlist);
  
  try {
    execSync(`plutil -convert binary1 -o "${tempOut}" "${tempIn}"`, { stdio: 'pipe' });
    const binaryContent = await fs.readFile(tempOut);
    
    await fs.unlink(tempIn);
    await fs.unlink(tempOut);
    
    return binaryContent;
  } catch (error) {
    await fs.unlink(tempIn).catch(() => {});
    throw new Error(`Binary plist conversion failed: ${error}`);
  }
}

function extractActionType(identifier: string): string {
  if (!identifier) return 'unknown';
  
  const parts = identifier.split('.');
  return parts[parts.length - 1] || identifier;
}

export function toJSON(shortcut: InternalShortcut | AppleShortcut): string {
  return JSON.stringify(shortcut, null, 2);
}

export function generateShortcutHTML(shortcut: InternalShortcut): string {
  const actionCategoryColors: Record<string, string> = {
    scripting: '#8e8e93',
    text: '#ff9500',
    media: '#ff2d55',
    documents: '#5856d6',
    sharing: '#34c759',
    web: '#007aff',
    location: '#00c7be',
    calendar: '#ff3b30',
    contacts: '#af52de',
    health: '#ff2d55',
    device: '#8e8e93',
    notification: '#ff9500',
    general: '#5856d6'
  };

  const getActionCategory = (identifier: string): string => {
    const id = identifier.toLowerCase();
    if (id.includes('text') || id.includes('string')) return 'text';
    if (id.includes('notification') || id.includes('alert')) return 'notification';
    if (id.includes('url') || id.includes('web') || id.includes('safari')) return 'web';
    if (id.includes('photo') || id.includes('video') || id.includes('media')) return 'media';
    if (id.includes('file') || id.includes('document')) return 'documents';
    if (id.includes('location') || id.includes('map')) return 'location';
    if (id.includes('calendar') || id.includes('reminder')) return 'calendar';
    if (id.includes('contact') || id.includes('message')) return 'contacts';
    if (id.includes('if') || id.includes('repeat') || id.includes('variable')) return 'scripting';
    return 'general';
  };

  const formatParameters = (params: Record<string, any>): string => {
    return Object.entries(params)
      .filter(([key]) => !['UUID', 'GroupingIdentifier'].includes(key))
      .map(([key, value]) => {
        const displayKey = key.replace(/^WF/, '').replace(/Action.*$/, '');
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `<div class="param"><span class="param-key">${displayKey}:</span> <span class="param-value">${escapeHtml(displayValue)}</span></div>`;
      })
      .join('');
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const actionsHtml = shortcut.actions.map((action, index) => {
    const category = getActionCategory(action.identifier);
    const color = actionCategoryColors[category];
    const name = action.type.replace(/([A-Z])/g, ' $1').trim();
    
    return `
      <div class="action" style="border-left-color: ${color}">
        <div class="action-header">
          <span class="action-number">${index + 1}</span>
          <span class="action-name">${name}</span>
          <span class="action-id">${action.identifier}</span>
        </div>
        <div class="action-params">
          ${formatParameters(action.parameters)}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(shortcut.name)} - Shortcut Preview</title>
  <style>
    :root {
      --bg-primary: #1c1c1e;
      --bg-secondary: #2c2c2e;
      --text-primary: #ffffff;
      --text-secondary: #8e8e93;
      --border-color: #3a3a3c;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      padding: 20px;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    .header {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .shortcut-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #007aff, #5856d6);
      border-radius: 18px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
    }
    
    .shortcut-name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .shortcut-meta {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .actions-container {
      background: var(--bg-secondary);
      border-radius: 16px;
      overflow: hidden;
    }
    
    .action {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      border-left: 4px solid #007aff;
    }
    
    .action:last-child {
      border-bottom: none;
    }
    
    .action-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .action-number {
      background: rgba(255,255,255,0.1);
      width: 24px;
      height: 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }
    
    .action-name {
      font-weight: 600;
      flex: 1;
    }
    
    .action-id {
      font-size: 11px;
      color: var(--text-secondary);
      font-family: 'SF Mono', Monaco, monospace;
    }
    
    .action-params {
      padding-left: 36px;
    }
    
    .param {
      font-size: 14px;
      margin: 4px 0;
    }
    
    .param-key {
      color: var(--text-secondary);
    }
    
    .param-value {
      color: #34c759;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary);
      font-size: 12px;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg-primary: #f2f2f7;
        --bg-secondary: #ffffff;
        --text-primary: #000000;
        --text-secondary: #8e8e93;
        --border-color: #c6c6c8;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="shortcut-icon">⚡</div>
      <h1 class="shortcut-name">${escapeHtml(shortcut.name)}</h1>
      <div class="shortcut-meta">${shortcut.actions.length} actions</div>
    </div>
    
    <div class="actions-container">
      ${actionsHtml}
    </div>
    
    <div class="footer">
      Generated by Shortcut Genius
    </div>
  </div>
</body>
</html>`;
}
