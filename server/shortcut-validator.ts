import { KNOWN_APPLE_IDENTIFIERS } from './shortcut-builder';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  actionIndex: number;
  field?: string;
  message: string;
  suggestedFix?: string;
}

// Actions that produce output consumed by the next action
const OUTPUT_PRODUCING_ACTIONS = new Set([
  'is.workflow.actions.url',
  'is.workflow.actions.gettext',
  'is.workflow.actions.number',
  'is.workflow.actions.ask',
  'is.workflow.actions.getcontentsofurl',
  'is.workflow.actions.getclipboard',
  'is.workflow.actions.location',
  'is.workflow.actions.date',
  'is.workflow.actions.takephoto',
  'is.workflow.actions.recordaudio',
]);

// Actions that require URL input (either explicit or from previous action)
const URL_CONSUMING_ACTIONS = new Set([
  'is.workflow.actions.getcontentsofurl',
  'is.workflow.actions.openurl',
]);

// Deprecated identifiers and their replacements
const DEPRECATED_IDENTIFIERS: Record<string, string> = {
  'is.workflow.actions.downloadurl': 'is.workflow.actions.getcontentsofurl',
};

const PLACEHOLDER_PATTERNS = [
  /your\s+text\s+here/i,
  /\btodo\b/i,
  /example\.com/i,
  /test123/i,
  /placeholder/i,
  /insert.*here/i,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(value));
}

function resolveIdentifier(raw: string): string {
  // If already fully qualified, return as-is
  if (raw.startsWith('is.workflow.actions.') || raw.startsWith('com.apple.')) {
    return raw;
  }
  // Map common short names
  const SHORT_MAP: Record<string, string> = {
    url: 'is.workflow.actions.url',
    getcontentsofurl: 'is.workflow.actions.getcontentsofurl',
    downloadurl: 'is.workflow.actions.getcontentsofurl',
    quicklook: 'is.workflow.actions.quicklook',
    showresult: 'is.workflow.actions.showresult',
    notification: 'is.workflow.actions.shownotification',
    text: 'is.workflow.actions.gettext',
    ask: 'is.workflow.actions.ask',
    speak: 'is.workflow.actions.speak',
  };
  return SHORT_MAP[raw.toLowerCase()] || raw;
}

export function validateShortcutDataFlow(shortcut: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!shortcut || !Array.isArray(shortcut.actions)) {
    issues.push({ severity: 'error', actionIndex: -1, message: 'Shortcut has no actions array.' });
    return issues;
  }

  if (shortcut.actions.length === 0) {
    issues.push({ severity: 'error', actionIndex: -1, message: 'Shortcut has zero actions.' });
    return issues;
  }

  const actions: any[] = shortcut.actions;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const rawType: string = action.type || action.WFWorkflowActionIdentifier || '';
    const resolved = resolveIdentifier(rawType);
    const params: Record<string, any> = action.parameters || action.WFWorkflowActionParameters || {};

    // Check for deprecated identifiers
    if (DEPRECATED_IDENTIFIERS[resolved]) {
      issues.push({
        severity: 'error',
        actionIndex: i,
        field: 'type',
        message: `Action ${i + 1} uses deprecated identifier "${resolved}". Use "${DEPRECATED_IDENTIFIERS[resolved]}" instead.`,
        suggestedFix: `Change type to "${DEPRECATED_IDENTIFIERS[resolved]}"`
      });
    }

    // Check identifier is known (only for fully-qualified identifiers)
    if (
      resolved.startsWith('is.workflow.actions.') &&
      !KNOWN_APPLE_IDENTIFIERS.has(resolved) &&
      !DEPRECATED_IDENTIFIERS[resolved]
    ) {
      issues.push({
        severity: 'error',
        actionIndex: i,
        field: 'type',
        message: `Action ${i + 1} has unknown identifier "${resolved}". Verify this is a valid iOS Shortcuts action.`,
        suggestedFix: 'Check the action identifier spelling against Apple Shortcuts documentation.'
      });
    }

    // Check url action has a non-empty, non-placeholder URL
    if (resolved === 'is.workflow.actions.url') {
      const urlValue: string = params.WFURLActionURL || params.url || '';
      if (!urlValue) {
        issues.push({
          severity: 'error',
          actionIndex: i,
          field: 'WFURLActionURL',
          message: `Action ${i + 1} (url): WFURLActionURL is empty — a URL is required.`,
          suggestedFix: 'Set WFURLActionURL to the actual URL you want to fetch.'
        });
      } else if (isPlaceholder(urlValue)) {
        issues.push({
          severity: 'error',
          actionIndex: i,
          field: 'WFURLActionURL',
          message: `Action ${i + 1} (url): WFURLActionURL "${urlValue}" looks like a placeholder.`,
          suggestedFix: 'Replace the placeholder URL with the real destination URL.'
        });
      }
    }

    // Check getcontentsofurl — warn if no preceding url action or inline URL
    if (resolved === 'is.workflow.actions.getcontentsofurl') {
      const hasInlineUrl = params.WFURL || params.url || params.WFURLActionURL;
      const hasPrecedingUrl = i > 0 && resolveIdentifier(
        actions[i - 1].type || actions[i - 1].WFWorkflowActionIdentifier || ''
      ) === 'is.workflow.actions.url';

      if (!hasInlineUrl && !hasPrecedingUrl) {
        issues.push({
          severity: 'warning',
          actionIndex: i,
          message: `Action ${i + 1} (getcontentsofurl): No URL action precedes this and no inline URL found. Make sure a URL is passed implicitly or explicitly.`,
          suggestedFix: 'Add a "url" action immediately before this action, or set the WFURL parameter directly.'
        });
      }
    }

    // Check text/gettext has non-empty, non-placeholder content
    if (resolved === 'is.workflow.actions.gettext') {
      const textValue: string = params.WFTextActionText || params.text || '';
      if (!textValue) {
        issues.push({
          severity: 'error',
          actionIndex: i,
          field: 'WFTextActionText',
          message: `Action ${i + 1} (text): WFTextActionText is empty.`,
          suggestedFix: 'Set WFTextActionText to the desired text content.'
        });
      } else if (isPlaceholder(textValue)) {
        issues.push({
          severity: 'warning',
          actionIndex: i,
          field: 'WFTextActionText',
          message: `Action ${i + 1} (text): Text content "${textValue}" looks like a placeholder.`,
          suggestedFix: 'Replace placeholder text with real content.'
        });
      }
    }

    // Detect if "url" action appears but no fetch action follows
    if (resolved === 'is.workflow.actions.url') {
      const nextAction = actions[i + 1];
      if (nextAction) {
        const nextResolved = resolveIdentifier(
          nextAction.type || nextAction.WFWorkflowActionIdentifier || ''
        );
        if (!URL_CONSUMING_ACTIONS.has(nextResolved)) {
          issues.push({
            severity: 'warning',
            actionIndex: i,
            message: `Action ${i + 1} (url) sets a URL but the next action "${nextResolved}" doesn't consume it. Did you forget a "getcontentsofurl" action?`,
            suggestedFix: 'Add "getcontentsofurl" after the "url" action to fetch the URL.'
          });
        }
      }
    }
  }

  return issues;
}

export function formatValidationIssuesForAI(shortcut: any, issues: ValidationIssue[]): string {
  const lines: string[] = [
    'Your generated shortcut has these issues that will prevent it from running correctly:',
    ''
  ];

  issues.forEach((issue, idx) => {
    const actionLabel = issue.actionIndex >= 0
      ? `Action ${issue.actionIndex + 1}`
      : 'Shortcut';
    lines.push(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${actionLabel}: ${issue.message}`);
    if (issue.suggestedFix) {
      lines.push(`     Fix: ${issue.suggestedFix}`);
    }
  });

  lines.push('');
  lines.push('Here is the current shortcut JSON:');
  lines.push(JSON.stringify(shortcut, null, 2));
  lines.push('');
  lines.push('Please fix ALL issues and return ONLY the corrected JSON shortcut, no markdown, no explanation.');

  return lines.join('\n');
}
