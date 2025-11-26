#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WFACTIONS_PATH = '/System/Library/PrivateFrameworks/WorkflowKit.framework/WFActions.plist';
const OUTPUT_PATH = path.join(__dirname, '..', 'authoritative-actions.json');
const TEMP_PATH = '/tmp/WFActions.json';

function extractWFActions() {
  console.log('🍎 Extracting Apple Shortcuts Action Database');
  console.log('================================================\n');

  if (process.platform !== 'darwin') {
    console.error('❌ This script must be run on macOS');
    console.log('   The WFActions.plist is only available on macOS systems.');
    process.exit(1);
  }

  if (!fs.existsSync(WFACTIONS_PATH)) {
    console.error(`❌ WFActions.plist not found at: ${WFACTIONS_PATH}`);
    console.log('   Make sure Shortcuts.app is installed.');
    process.exit(1);
  }

  console.log(`📂 Reading from: ${WFACTIONS_PATH}`);

  try {
    execSync(`plutil -convert json -o "${TEMP_PATH}" "${WFACTIONS_PATH}"`, { stdio: 'pipe' });
    console.log('✅ Converted plist to JSON');
  } catch (error) {
    console.error('❌ Failed to convert plist:', error.message);
    process.exit(1);
  }

  const rawActions = JSON.parse(fs.readFileSync(TEMP_PATH, 'utf8'));
  console.log(`📊 Found ${Object.keys(rawActions).length} actions in WFActions.plist\n`);

  const processedActions = {};
  const categories = new Set();

  for (const [identifier, actionData] of Object.entries(rawActions)) {
    const action = processAction(identifier, actionData);
    processedActions[identifier] = action;
    if (action.category) categories.add(action.category);
  }

  const sortedActions = Object.fromEntries(
    Object.entries(processedActions).sort(([a], [b]) => a.localeCompare(b))
  );

  const database = {
    metadata: {
      version: '1.0.0',
      extractedAt: new Date().toISOString(),
      source: WFACTIONS_PATH,
      platform: 'macOS',
      macOSVersion: execSync('sw_vers -productVersion').toString().trim(),
      totalActions: Object.keys(sortedActions).length,
      categories: Array.from(categories).sort()
    },
    actions: sortedActions
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(database, null, 2));
  console.log(`✅ Saved authoritative database to: ${OUTPUT_PATH}`);
  console.log(`   Total actions: ${database.metadata.totalActions}`);
  console.log(`   Categories: ${database.metadata.categories.join(', ')}`);

  fs.unlinkSync(TEMP_PATH);

  return database;
}

function processAction(identifier, raw) {
  const action = {
    identifier,
    name: raw.Name || raw.ActionClass || generateNameFromIdentifier(identifier),
    description: raw.Description?.DescriptionSummary || raw.Description || '',
    category: raw.Category || inferCategory(identifier),
    actionClass: raw.ActionClass || null,
    
    parameters: processParameters(raw.Parameters || raw.ParameterDefinitions || []),
    
    input: {
      types: raw.Input?.Types || raw.InputContentItemClasses || [],
      multiple: raw.Input?.Multiple || false,
      parameterKey: raw.Input?.ParameterKey || null
    },
    
    output: {
      types: raw.Output?.Types || raw.OutputContentItemClasses || [],
      multiple: raw.Output?.Multiple || false
    },
    
    icon: {
      glyph: raw.IconName || raw.WFIconName || null,
      color: raw.IconColor || null
    },
    
    keywords: raw.Keywords || raw.SearchKeywords || [],
    
    requiresDevice: raw.RequiredResources || [],
    minimumVersion: raw.AppMinimumVersion || null,
    deprecated: raw.Deprecated || false,
    hidden: raw.Hidden || false,
    
    confidence: 'authoritative',
    source: 'WFActions.plist'
  };

  return action;
}

function processParameters(rawParams) {
  if (!rawParams || !Array.isArray(rawParams)) {
    if (typeof rawParams === 'object') {
      return Object.entries(rawParams).map(([key, value]) => ({
        key,
        ...processParameterValue(value)
      }));
    }
    return [];
  }

  return rawParams.map(param => {
    if (typeof param === 'string') {
      return { key: param, type: 'string', required: false };
    }
    
    return {
      key: param.Key || param.key || 'unknown',
      type: mapParameterType(param.Class || param.DataType || param.Type || 'string'),
      label: param.Label || param.Title || null,
      description: param.Description || param.Placeholder || null,
      required: param.Required || param.DefaultValue === undefined,
      defaultValue: param.DefaultValue || param.Default || null,
      options: param.Items || param.Options || param.AllowedValues || null,
      validation: extractValidation(param)
    };
  }).filter(p => p.key !== 'unknown');
}

function processParameterValue(value) {
  if (typeof value !== 'object') {
    return { type: typeof value, defaultValue: value };
  }
  
  return {
    type: mapParameterType(value.Class || value.Type || 'string'),
    label: value.Label || value.Title || null,
    description: value.Description || null,
    required: value.Required || false,
    defaultValue: value.DefaultValue || null,
    options: value.Items || value.Options || null
  };
}

function mapParameterType(rawType) {
  const typeMap = {
    'WFTextInputParameter': 'string',
    'WFNumberFieldParameter': 'number',
    'WFSwitchParameter': 'boolean',
    'WFEnumerationParameter': 'enum',
    'WFVariablePickerParameter': 'variable',
    'WFDictionaryParameter': 'dictionary',
    'WFArrayParameter': 'array',
    'WFDateFieldParameter': 'date',
    'WFTimeIntervalParameter': 'duration',
    'WFLocationParameter': 'location',
    'WFContactFieldParameter': 'contact',
    'WFContentArrayParameter': 'contentArray',
    'WFSliderParameter': 'slider',
    'WFStepperParameter': 'stepper',
    'WFAppPickerParameter': 'app',
    'WFWorkflowPickerParameter': 'shortcut',
    'WFCalendarPickerParameter': 'calendar',
    'WFEmailAddressFieldParameter': 'email',
    'WFPhoneNumberFieldParameter': 'phone',
    'WFURLParameter': 'url',
    'WFFileLinkParameter': 'file'
  };

  return typeMap[rawType] || rawType?.toLowerCase() || 'any';
}

function extractValidation(param) {
  const validation = {};
  
  if (param.MinimumValue !== undefined) validation.min = param.MinimumValue;
  if (param.MaximumValue !== undefined) validation.max = param.MaximumValue;
  if (param.TextContentType) validation.contentType = param.TextContentType;
  if (param.AllowsMultipleValues) validation.multiple = true;
  
  return Object.keys(validation).length > 0 ? validation : null;
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

extractWFActions();
