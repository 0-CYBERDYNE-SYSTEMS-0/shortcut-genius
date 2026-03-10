import plist from 'plist';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Shortcut, ShortcutAction } from '../client/src/lib/shortcuts';

// Apple's shortcut file structure
interface AppleShortcut {
  WFWorkflowName: string;
  WFWorkflowIcon: {
    WFWorkflowIconStartColor: number;
    WFWorkflowIconGlyphNumber: number;
  };
  WFWorkflowClientVersion: string;
  WFWorkflowClientRelease: string;
  WFWorkflowMinimumClientVersion: number;
  WFWorkflowImportQuestions: any[];
  WFWorkflowTypes: string[];
  WFWorkflowInputContentItemClasses: string[];
  WFWorkflowActions: AppleAction[];
}

interface AppleAction {
  WFWorkflowActionIdentifier: string;
  WFWorkflowActionParameters: Record<string, any>;
}

const APPLE_ACTION_PREFIXES = ['is.workflow.actions.', 'com.apple.'];

function isAppleActionIdentifier(type: string): boolean {
  return APPLE_ACTION_PREFIXES.some(prefix => type.startsWith(prefix));
}

// Known-good Apple Shortcuts action identifiers for validation
export const KNOWN_APPLE_IDENTIFIERS = new Set([
  'is.workflow.actions.url',
  'is.workflow.actions.getcontentsofurl',
  'is.workflow.actions.showresult',
  'is.workflow.actions.quicklook',
  'is.workflow.actions.gettext',
  'is.workflow.actions.number',
  'is.workflow.actions.ask',
  'is.workflow.actions.conditional',
  'is.workflow.actions.repeat.count',
  'is.workflow.actions.repeat.each',
  'is.workflow.actions.delay',
  'is.workflow.actions.playsound',
  'is.workflow.actions.recordaudio',
  'is.workflow.actions.takephoto',
  'is.workflow.actions.selectphotos',
  'is.workflow.actions.setvolume',
  'is.workflow.actions.setbrightness',
  'is.workflow.actions.dnd.set',
  'is.workflow.actions.shownotification',
  'is.workflow.actions.createnote',
  'is.workflow.actions.documentpicker.open',
  'is.workflow.actions.savefile',
  'is.workflow.actions.addnewevent',
  'is.workflow.actions.contacts',
  'is.workflow.actions.location',
  'is.workflow.actions.getdirections',
  'is.workflow.actions.health.quantity.log',
  'is.workflow.actions.health.quantity.get',
  'is.workflow.actions.homekit.set',
  'is.workflow.actions.homekit.get',
  'is.workflow.actions.getclipboard',
  'is.workflow.actions.setclipboard',
  'is.workflow.actions.speak',
  'is.workflow.actions.openurl',
  'is.workflow.actions.searchsafari',
  'is.workflow.actions.filter.files',
  'is.workflow.actions.base64encode',
  'is.workflow.actions.hash',
  'is.workflow.actions.format.number',
  'is.workflow.actions.format.date',
  'is.workflow.actions.date',
  'is.workflow.actions.calculateexpression',
  'is.workflow.actions.downloadurl',  // legacy alias kept
]);

// Mapping from ShortcutGenius actions to Apple Shortcuts actions
const ACTION_MAPPING: Record<string, string> = {
  text: 'is.workflow.actions.gettext',
  number: 'is.workflow.actions.number',
  ask: 'is.workflow.actions.ask',
  if: 'is.workflow.actions.conditional',
  repeat: 'is.workflow.actions.repeat.count',
  wait: 'is.workflow.actions.delay',
  play_sound: 'is.workflow.actions.playsound',
  record_audio: 'is.workflow.actions.recordaudio',
  take_photo: 'is.workflow.actions.takephoto',
  select_photos: 'is.workflow.actions.selectphotos',
  set_volume: 'is.workflow.actions.setvolume',
  set_brightness: 'is.workflow.actions.setbrightness',
  set_do_not_disturb: 'is.workflow.actions.dnd.set',
  url: 'is.workflow.actions.url',
  notification: 'is.workflow.actions.shownotification',
  create_note: 'is.workflow.actions.createnote',
  files: 'is.workflow.actions.documentpicker.open',
  save_file: 'is.workflow.actions.savefile',
  calendar: 'is.workflow.actions.addnewevent',
  contacts: 'is.workflow.actions.contacts',
  get_location: 'is.workflow.actions.location',
  get_directions: 'is.workflow.actions.getdirections',
  log_health: 'is.workflow.actions.health.quantity.log',
  get_health: 'is.workflow.actions.health.quantity.get',
  control_devices: 'is.workflow.actions.homekit.set',
  get_device_state: 'is.workflow.actions.homekit.get',
  // Correct fetch/display identifiers
  'get-url': 'is.workflow.actions.getcontentsofurl',
  getcontentsofurl: 'is.workflow.actions.getcontentsofurl',
  'get_contents_of_url': 'is.workflow.actions.getcontentsofurl',
  downloadurl: 'is.workflow.actions.getcontentsofurl',
  'show-result': 'is.workflow.actions.showresult',
  show_result: 'is.workflow.actions.showresult',
  showresult: 'is.workflow.actions.showresult',
  quicklook: 'is.workflow.actions.quicklook',
  'quick-look': 'is.workflow.actions.quicklook',
  'quick_look': 'is.workflow.actions.quicklook',
  previewdocument: 'is.workflow.actions.quicklook',
  speak: 'is.workflow.actions.speak',
  clipboard: 'is.workflow.actions.getclipboard',
  get_clipboard: 'is.workflow.actions.getclipboard',
  set_clipboard: 'is.workflow.actions.setclipboard',
  open_url: 'is.workflow.actions.openurl',
};

// Parameter mapping from ShortcutGenius to Apple format
function mapParameters(actionType: string, parameters: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};

  switch (actionType) {
    case 'text':
      mapped.WFTextActionText = parameters.text || '';
      break;

    case 'number':
      mapped.WFNumberActionNumber = parameters.value || 0;
      break;

    case 'ask':
      mapped.WFAskActionPrompt = parameters.prompt || 'Enter input';
      mapped.WFAskActionDefaultAnswer = parameters.defaultValue || '';
      break;

    case 'notification':
      mapped.WFNotificationActionTitle = parameters.title || '';
      mapped.WFNotificationActionBody = parameters.body || '';
      mapped.WFNotificationActionSound = parameters.sound || true;
      break;

    case 'create_note':
      mapped.WFNoteActionNote = parameters.text || '';
      if (parameters.title) {
        mapped.WFNoteActionTitle = parameters.title;
      }
      break;

    case 'save_file':
      if (parameters.path) {
        mapped.WFSaveFileDestinationPath = parameters.path;
      }
      break;

    case 'wait':
      mapped.WFDelayTime = parameters.seconds || 1;
      break;

    case 'url':
      mapped.WFURLActionURL = parameters.url || '';
      break;

    case 'set_volume':
      mapped.WFSetVolumeActionVolume = (parameters.level || 50) / 100;
      break;

    case 'set_brightness':
      mapped.WFSetBrightnessActionBrightness = (parameters.level || 50) / 100;
      break;

    case 'take_photo':
      mapped.WFCameraCaptureShowPreview = true;
      mapped.WFCameraCaptureDevice = parameters.useFrontCamera ? 'Front' : 'Back';
      mapped.WFCameraCaptureFlashMode = parameters.flash || 'Auto';
      break;

    case 'if':
      // Conditional actions require more complex mapping
      mapped.WFConditionalActionString = parameters.condition || '';
      mapped.GroupingIdentifier = uuidv4();
      break;

    case 'repeat':
      mapped.WFRepeatCount = parameters.count || 1;
      mapped.GroupingIdentifier = uuidv4();
      break;

    default:
      // Copy parameters as-is for unmapped actions
      Object.assign(mapped, parameters);
  }

  return mapped;
}

// Convert ShortcutGenius action to Apple Shortcuts action
function convertAction(action: ShortcutAction): AppleAction {
  if (isAppleActionIdentifier(action.type)) {
    const params = action.parameters || {};
    return {
      WFWorkflowActionIdentifier: action.type,
      WFWorkflowActionParameters: {
        ...params,
        WFWorkflowActionUUID: params.WFWorkflowActionUUID || uuidv4()
      }
    };
  }

  const appleIdentifier = ACTION_MAPPING[action.type];
  if (!appleIdentifier) {
    throw new Error(`Unsupported action type: ${action.type}`);
  }

  return {
    WFWorkflowActionIdentifier: appleIdentifier,
    WFWorkflowActionParameters: {
      ...mapParameters(action.type, action.parameters),
      WFWorkflowActionUUID: uuidv4()
    }
  };
}

// Actions whose output is worth inspecting in debug mode
const DEBUG_OUTPUT_ACTIONS = new Set([
  'is.workflow.actions.getcontentsofurl',
  'is.workflow.actions.url',
  'is.workflow.actions.gettext',
  'is.workflow.actions.ask',
  'is.workflow.actions.location',
  'is.workflow.actions.date',
  'is.workflow.actions.getclipboard',
  'is.workflow.actions.calculateexpression',
  'is.workflow.actions.base64encode',
  'is.workflow.actions.hash',
]);

// Build Apple Shortcuts plist structure
export function buildAppleShortcut(shortcut: Shortcut, options?: { debug?: boolean }): AppleShortcut {
  const rawActions = shortcut.actions.map(convertAction);
  let actions = rawActions;

  if (options?.debug) {
    const debugActions: AppleAction[] = [];
    for (const action of rawActions) {
      debugActions.push(action);
      if (DEBUG_OUTPUT_ACTIONS.has(action.WFWorkflowActionIdentifier)) {
        debugActions.push({
          WFWorkflowActionIdentifier: 'is.workflow.actions.showresult',
          WFWorkflowActionParameters: {
            WFShowResultActionResult: `[DEBUG] Output from ${action.WFWorkflowActionIdentifier}`,
            WFWorkflowActionUUID: uuidv4()
          }
        });
      }
    }
    actions = debugActions;
  }

  return {
    WFWorkflowName: shortcut.name,
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: 431817727, // Default blue color
      WFWorkflowIconGlyphNumber: 59511 // Default gear icon
    },
    WFWorkflowClientVersion: '2781',
    WFWorkflowClientRelease: '2.2.2',
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowImportQuestions: [],
    WFWorkflowTypes: ['NCWidget', 'WatchKit'],
    WFWorkflowInputContentItemClasses: [
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
    WFWorkflowActions: actions
  };
}

// Convert to plist format
export function convertToPlist(shortcut: Shortcut, options?: { debug?: boolean }): Buffer {
  const appleShortcut = buildAppleShortcut(shortcut, options);
  const plistString = plist.build(appleShortcut);
  return Buffer.from(plistString, 'utf8');
}

// Convert to binary plist format
export function convertToBinaryPlist(shortcut: Shortcut, options?: { debug?: boolean }): Buffer {
  const appleShortcut = buildAppleShortcut(shortcut, options);

  // For now, we'll create XML plist and note that binary conversion
  // would require additional native tools or libraries
  const plistString = plist.build(appleShortcut);
  return Buffer.from(plistString, 'utf8');
}

// Generate shortcut file metadata
export function generateShortcutMetadata(shortcut: Shortcut) {
  const id = uuidv4();
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(shortcut))
    .digest('hex');

  return {
    id,
    name: shortcut.name,
    hash,
    actionCount: shortcut.actions.length,
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
}

// Validate shortcut compatibility
export function validateAppleCompatibility(shortcut: Shortcut): string[] {
  const errors: string[] = [];

  // Check for unsupported actions
  shortcut.actions.forEach((action, index) => {
    if (!ACTION_MAPPING[action.type] && !isAppleActionIdentifier(action.type)) {
      errors.push(`Action ${index + 1}: "${action.type}" is not supported in Apple Shortcuts`);
    }
  });

  // Check name length (Apple has limits)
  if (shortcut.name.length > 255) {
    errors.push('Shortcut name is too long (maximum 255 characters)');
  }

  // Check action count (Apple has limits)
  if (shortcut.actions.length > 100) {
    errors.push('Too many actions (Apple Shortcuts supports maximum 100 actions)');
  }

  return errors;
}
