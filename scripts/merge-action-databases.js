#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'actions-database.json');

const DATABASE_FILES = [
  'authoritative-actions.json',
  'final-action-database.json',
  'comprehensive-action-database.json',
  'enhanced-action-database.json',
  'action-database.json'
];

function mergeActionDatabases() {
  console.log('🔄 Merging Action Databases');
  console.log('============================\n');

  const mergedActions = {};
  const sources = [];

  for (const file of DATABASE_FILES) {
    const filePath = path.join(ROOT_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping (not found): ${file}`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let actions = data.actions || data;
      
      if (file === 'authoritative-actions.json' && data.metadata) {
        console.log(`📊 Authoritative source: ${data.metadata.totalActions} actions from ${data.metadata.source}`);
        sources.push({ file, count: Object.keys(actions).length, priority: 1 });
      } else {
        sources.push({ file, count: Object.keys(actions).length, priority: sources.length + 2 });
      }

      for (const [identifier, action] of Object.entries(actions)) {
        const existing = mergedActions[identifier];
        
        if (!existing) {
          mergedActions[identifier] = normalizeAction(identifier, action, file);
        } else {
          mergedActions[identifier] = mergeAction(existing, action, file);
        }
      }

      console.log(`✅ Loaded ${Object.keys(actions).length} actions from: ${file}`);
    } catch (error) {
      console.log(`❌ Failed to load ${file}: ${error.message}`);
    }
  }

  const validActions = {};
  let validCount = 0;
  let invalidCount = 0;

  for (const [identifier, action] of Object.entries(mergedActions)) {
    if (isValidAction(identifier, action)) {
      validActions[identifier] = action;
      validCount++;
    } else {
      invalidCount++;
    }
  }

  console.log(`\n📊 Validation Results:`);
  console.log(`   Valid actions: ${validCount}`);
  console.log(`   Invalid/filtered: ${invalidCount}`);

  const sortedActions = Object.fromEntries(
    Object.entries(validActions).sort(([a], [b]) => a.localeCompare(b))
  );

  const database = {
    metadata: {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      sources: sources,
      totalActions: Object.keys(sortedActions).length,
      categories: [...new Set(Object.values(sortedActions).map(a => a.category))].filter(Boolean).sort()
    },
    actions: sortedActions
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(database, null, 2));
  console.log(`\n✅ Saved merged database to: ${OUTPUT_PATH}`);
  console.log(`   Total actions: ${database.metadata.totalActions}`);

  const aiPrompt = generateAIPrompt(database);
  fs.writeFileSync(path.join(ROOT_DIR, 'ai-actions-reference.md'), aiPrompt);
  console.log(`✅ Generated AI reference: ai-actions-reference.md`);

  return database;
}

function normalizeAction(identifier, action, source) {
  return {
    identifier,
    name: action.name || generateNameFromIdentifier(identifier),
    description: action.description || '',
    category: action.category || inferCategory(identifier),
    actionClass: action.actionClass || null,
    
    parameters: normalizeParameters(action.parameters || []),
    
    input: {
      types: action.input?.types || action.inputTypes || [],
      multiple: action.input?.multiple || false,
      parameterKey: action.input?.parameterKey || null
    },
    
    output: {
      types: action.output?.types || action.outputTypes || [],
      multiple: action.output?.multiple || false
    },
    
    keywords: action.keywords || [],
    permissions: action.permissions || 'none',
    minimumVersion: action.minimumVersion || action.iosVersion || null,
    deprecated: action.deprecated || false,
    
    confidence: action.confidence || (source === 'authoritative-actions.json' ? 'authoritative' : 'low'),
    sources: [source],
    
    usageExamples: action.usageExamples || [],
    relatedActions: action.relatedActions || [],
    alternatives: action.alternatives || []
  };
}

function mergeAction(existing, newAction, source) {
  if (existing.confidence === 'authoritative' && source !== 'authoritative-actions.json') {
    existing.sources = [...new Set([...existing.sources, source])];
    
    if (newAction.usageExamples?.length) {
      existing.usageExamples = [...new Set([...existing.usageExamples, ...newAction.usageExamples])];
    }
    if (newAction.relatedActions?.length) {
      existing.relatedActions = [...new Set([...existing.relatedActions, ...newAction.relatedActions])];
    }
    
    return existing;
  }

  return {
    ...existing,
    description: existing.description || newAction.description,
    parameters: mergeParameters(existing.parameters, newAction.parameters),
    usageExamples: [...new Set([...existing.usageExamples, ...(newAction.usageExamples || [])])],
    relatedActions: [...new Set([...existing.relatedActions, ...(newAction.relatedActions || [])])],
    sources: [...new Set([...existing.sources, source])],
    confidence: existing.confidence === 'authoritative' ? 'authoritative' : 
                newAction.confidence === 'high' ? 'high' : existing.confidence
  };
}

function normalizeParameters(params) {
  if (!Array.isArray(params)) {
    if (typeof params === 'object') {
      return Object.entries(params).map(([key, value]) => ({
        key,
        type: typeof value === 'object' ? (value.type || 'string') : typeof value,
        ...(typeof value === 'object' ? value : {})
      }));
    }
    return [];
  }

  return params.map(param => {
    if (typeof param === 'string') {
      return { key: param, type: 'string', required: false };
    }
    return {
      key: param.key || param.Key || 'unknown',
      type: param.type || 'string',
      label: param.label || param.Label || null,
      description: param.description || param.Description || null,
      required: param.required || false,
      defaultValue: param.defaultValue || param.DefaultValue || null,
      options: param.options || param.Items || null,
      validation: param.validation || null
    };
  });
}

function mergeParameters(existing, incoming) {
  if (!incoming?.length) return existing;
  
  const paramMap = new Map(existing.map(p => [p.key, p]));
  
  for (const param of incoming) {
    const key = param.key || param.Key;
    if (!key) continue;
    
    if (paramMap.has(key)) {
      const existingParam = paramMap.get(key);
      paramMap.set(key, {
        ...existingParam,
        description: existingParam.description || param.description,
        options: existingParam.options || param.options,
        validation: existingParam.validation || param.validation
      });
    } else {
      paramMap.set(key, normalizeParameters([param])[0]);
    }
  }
  
  return Array.from(paramMap.values());
}

function isValidAction(identifier, action) {
  if (!identifier.startsWith('is.workflow.actions.')) {
    if (!identifier.includes('.') || identifier.startsWith('com.apple.')) {
      return true;
    }
    return false;
  }
  
  if (action.deprecated) return false;
  
  if (action.confidence === 'authoritative') return true;
  
  return true;
}

function generateNameFromIdentifier(identifier) {
  const parts = identifier.split('.').pop() || identifier;
  return parts
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function inferCategory(identifier) {
  const id = identifier.toLowerCase();
  
  const categoryPatterns = {
    'scripting': ['script', 'variable', 'calculate', 'count', 'random', 'hash', 'base64', 'json', 'dictionary', 'list', 'repeat', 'conditional', 'if', 'choose', 'menu', 'exit', 'nothing', 'comment', 'wait', 'delay'],
    'text': ['text', 'string', 'replace', 'split', 'combine', 'match', 'case', 'spell', 'translate'],
    'media': ['photo', 'video', 'image', 'audio', 'music', 'play', 'record', 'camera', 'gif', 'media'],
    'documents': ['file', 'document', 'pdf', 'zip', 'archive', 'folder', 'save', 'create'],
    'sharing': ['share', 'airdrop', 'clipboard', 'copy', 'paste'],
    'web': ['url', 'web', 'safari', 'http', 'rss', 'feed', 'download'],
    'location': ['location', 'map', 'direction', 'address', 'weather', 'gps'],
    'calendar': ['calendar', 'event', 'reminder', 'date', 'time', 'alarm'],
    'contacts': ['contact', 'phone', 'call', 'message', 'email', 'facetime'],
    'health': ['health', 'workout', 'sleep', 'heart', 'step', 'fitness'],
    'device': ['volume', 'brightness', 'wifi', 'bluetooth', 'airplane', 'flashlight', 'wallpaper', 'vibrate', 'dnd', 'focus', 'lowpower'],
    'apps': ['app', 'open', 'shortcut', 'run'],
    'notification': ['notification', 'alert', 'speak', 'announce']
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some(pattern => id.includes(pattern))) {
      return category;
    }
  }

  return 'general';
}

function generateAIPrompt(database) {
  const lines = [
    '# iOS Shortcuts Action Reference',
    '',
    'This is the authoritative reference for iOS Shortcuts actions.',
    'Use these exact action identifiers when creating shortcuts.',
    '',
    `Total Actions: ${database.metadata.totalActions}`,
    `Categories: ${database.metadata.categories.join(', ')}`,
    '',
    '## Actions by Category',
    ''
  ];

  const byCategory = {};
  for (const [id, action] of Object.entries(database.actions)) {
    const cat = action.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ id, ...action });
  }

  for (const [category, actions] of Object.entries(byCategory).sort()) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push('');
    
    for (const action of actions.slice(0, 50)) {
      lines.push(`- **${action.name}** (\`${action.id}\`)`);
      if (action.description) {
        lines.push(`  ${action.description}`);
      }
      if (action.parameters?.length) {
        const params = action.parameters.slice(0, 3).map(p => p.key).join(', ');
        lines.push(`  Parameters: ${params}${action.parameters.length > 3 ? '...' : ''}`);
      }
    }
    
    if (actions.length > 50) {
      lines.push(`  ... and ${actions.length - 50} more`);
    }
    lines.push('');
  }

  lines.push('## Common Action Patterns');
  lines.push('');
  lines.push('### Show Notification');
  lines.push('```json');
  lines.push('{');
  lines.push('  "WFWorkflowActionIdentifier": "is.workflow.actions.notification",');
  lines.push('  "WFWorkflowActionParameters": {');
  lines.push('    "WFNotificationActionTitle": "Title",');
  lines.push('    "WFNotificationActionBody": "Message"');
  lines.push('  }');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('### Text Action');
  lines.push('```json');
  lines.push('{');
  lines.push('  "WFWorkflowActionIdentifier": "is.workflow.actions.gettext",');
  lines.push('  "WFWorkflowActionParameters": {');
  lines.push('    "WFTextActionText": "Hello World"');
  lines.push('  }');
  lines.push('}');
  lines.push('```');

  return lines.join('\n');
}

mergeActionDatabases();
