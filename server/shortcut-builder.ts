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
  files: 'is.workflow.actions.documentpicker.open',
  calendar: 'is.workflow.actions.addnewevent',
  contacts: 'is.workflow.actions.contacts',
  get_location: 'is.workflow.actions.location',
  get_directions: 'is.workflow.actions.getdirections',
  log_health: 'is.workflow.actions.health.quantity.log',
  get_health: 'is.workflow.actions.health.quantity.get',
  control_devices: 'is.workflow.actions.homekit.set',
  get_device_state: 'is.workflow.actions.homekit.get'
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
  const appleIdentifier = ACTION_MAPPING[action.type];
  if (!appleIdentifier) {
    throw new Error(`Unsupported action type: ${action.type}`);
  }

  return {
    WFWorkflowActionIdentifier: appleIdentifier,
    WFWorkflowActionParameters: mapParameters(action.type, action.parameters)
  };
}

// Build Apple Shortcuts plist structure
export function buildAppleShortcut(shortcut: Shortcut): AppleShortcut {
  const actions = shortcut.actions.map(convertAction);

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
export function convertToPlist(shortcut: Shortcut): Buffer {
  const appleShortcut = buildAppleShortcut(shortcut);
  const plistString = plist.build(appleShortcut);
  return Buffer.from(plistString, 'utf8');
}

// Convert to binary plist format
export function convertToBinaryPlist(shortcut: Shortcut): Buffer {
  const appleShortcut = buildAppleShortcut(shortcut);

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
    if (!ACTION_MAPPING[action.type]) {
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