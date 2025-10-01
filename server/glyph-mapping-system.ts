// iOS Shortcuts Glyph Mapping System
// Maps glyph numbers to descriptive names and icon information

export interface GlyphInfo {
  number: number;
  name: string;
  category: string;
  description: string;
  colorCompatibility: boolean;
  commonActions: string[];
}

export class GlyphMappingSystem {
  private glyphMap: Map<number, GlyphInfo> = new Map();
  private actionToGlyphMap: Map<string, number> = new Map();

  constructor() {
    this.initializeGlyphMappings();
    this.initializeActionGlyphMappings();
  }

  private initializeGlyphMappings() {
    // Common iOS Shortcuts glyphs with their numbers and descriptions
    const glyphs: GlyphInfo[] = [
      // Text & Communication
      { number: 59511, name: 'Text Bubble', category: 'text', description: 'Speech bubble with text lines', colorCompatibility: true, commonActions: ['text', 'notification'] },
      { number: 59512, name: 'Chat', category: 'communication', description: 'Conversation bubbles', colorCompatibility: true, commonActions: ['sendmessage'] },
      { number: 59513, name: 'Mail', category: 'communication', description: 'Envelope icon', colorCompatibility: true, commonActions: ['sendemail'] },
      { number: 59514, name: 'Phone', category: 'communication', description: 'Telephone handset', colorCompatibility: true, commonActions: ['makephonecall'] },

      // Actions & Controls
      { number: 59515, name: 'Play', category: 'media', description: 'Play button triangle', colorCompatibility: true, commonActions: ['playmusic'] },
      { number: 59516, name: 'Pause', category: 'media', description: 'Pause bars', colorCompatibility: true, commonActions: ['playmusic'] },
      { number: 59517, name: 'Stop', category: 'media', description: 'Square stop button', colorCompatibility: true, commonActions: ['stop'] },
      { number: 59518, name: 'Record', category: 'media', description: 'Record button circle', colorCompatibility: true, commonActions: ['recordaudio'] },

      // Navigation & Location
      { number: 59519, name: 'Location', category: 'location', description: 'Map pin', colorCompatibility: true, commonActions: ['getcurrentlocation'] },
      { number: 59520, name: 'Map', category: 'location', description: 'Map icon', colorCompatibility: true, commonActions: ['showmap'] },
      { number: 59521, name: 'Direction', category: 'location', description: 'Direction arrow', colorCompatibility: true, commonActions: ['getdirections'] },

      // Web & Internet
      { number: 59522, name: 'Globe', category: 'web', description: 'World globe', colorCompatibility: true, commonActions: ['url', 'getcontentsofurl'] },
      { number: 59523, name: 'Search', category: 'web', description: 'Magnifying glass', colorCompatibility: true, commonActions: ['searchweb'] },
      { number: 59524, name: 'Download', category: 'web', description: 'Download arrow', colorCompatibility: true, commonActions: ['getcontentsofurl'] },

      // System & Device
      { number: 59525, name: 'Settings', category: 'device', description: 'Gear icon', colorCompatibility: true, commonActions: ['setbrightness', 'setwifi'] },
      { number: 59526, name: 'Battery', category: 'device', description: 'Battery indicator', colorCompatibility: true, commonActions: ['getbatterylevel'] },
      { number: 59527, name: 'Wi-Fi', category: 'device', description: 'Wi-Fi signal waves', colorCompatibility: true, commonActions: ['getwifi', 'setwifi'] },
      { number: 59528, name: 'Bluetooth', category: 'device', description: 'Bluetooth symbol', colorCompatibility: true, commonActions: ['setbluetooth'] },

      // Media & Content
      { number: 59529, name: 'Camera', category: 'camera', description: 'Camera icon', colorCompatibility: true, commonActions: ['takephoto'] },
      { number: 59530, name: 'Photo', category: 'camera', description: 'Photo/mountain icon', colorCompatibility: true, commonActions: ['selectphoto'] },
      { number: 59531, name: 'Music Note', category: 'media', description: 'Musical note', colorCompatibility: true, commonActions: ['playmusic'] },
      { number: 59532, name: 'Video', category: 'media', description: 'Video camera', colorCompatibility: true, commonActions: ['recordvideo'] },

      // Data & Information
      { number: 59533, name: 'Calendar', category: 'data', description: 'Calendar page', colorCompatibility: true, commonActions: ['date', 'createcalendarevent'] },
      { number: 59534, name: 'Clock', category: 'data', description: 'Clock face', colorCompatibility: true, commonActions: ['time', 'wait'] },
      { number: 59535, name: 'Calculator', category: 'data', description: 'Calculator icon', colorCompatibility: true, commonActions: ['calculate'] },
      { number: 59536, name: 'Weather', category: 'data', description: 'Cloud/sun icon', colorCompatibility: true, commonActions: ['getcurrentweather'] },

      // Scripting & Logic
      { number: 59537, name: 'Code', category: 'scripting', description: 'Code brackets', colorCompatibility: true, commonActions: ['runscript', 'runjavascript'] },
      { number: 59538, name: 'Logic', category: 'scripting', description: 'Logic gate symbol', colorCompatibility: true, commonActions: ['if', 'conditional'] },
      { number: 59539, name: 'Loop', category: 'scripting', description: 'Circular arrows', colorCompatibility: true, commonActions: ['repeat', 'loop'] },
      { number: 59540, name: 'Variable', category: 'scripting', description: 'Variable/x symbol', colorCompatibility: true, commonActions: ['setvariable', 'getvariable'] },

      // Files & Documents
      { number: 59541, name: 'Document', category: 'files', description: 'Document page', colorCompatibility: true, commonActions: ['createnote', 'getfile'] },
      { number: 59542, name: 'Folder', category: 'files', description: 'Folder icon', colorCompatibility: true, commonActions: ['getfile', 'savefile'] },
      { number: 59543, name: 'PDF', category: 'files', description: 'PDF document icon', colorCompatibility: true, commonActions: ['createpdf'] },
      { number: 59544, name: 'Archive', category: 'files', description: 'Zip/archive icon', colorCompatibility: true, commonActions: ['archive'] },

      // User Interface
      { number: 59545, name: 'Alert', category: 'ui', description: 'Warning triangle', colorCompatibility: true, commonActions: ['showalert', 'notification'] },
      { number: 59546, name: 'Question', category: 'ui', description: 'Question mark in circle', colorCompatibility: true, commonActions: ['askforinput'] },
      { number: 59547, name: 'Checkmark', category: 'ui', description: 'Green checkmark', colorCompatibility: true, commonActions: ['showresult'] },
      { number: 59548, name: 'Heart', category: 'ui', description: 'Heart icon', colorCompatibility: true, commonActions: ['favorite'] },

      // Utilities
      { number: 59549, name: 'Clipboard', category: 'utilities', description: 'Clipboard with document', colorCompatibility: true, commonActions: ['copy', 'getclipboard'] },
      { number: 59550, name: 'Speaker', category: 'utilities', description: 'Speaker icon', colorCompatibility: true, commonActions: ['speak', 'setvolume'] },
      { number: 59551, name: 'Microphone', category: 'utilities', description: 'Microphone icon', colorCompatibility: true, commonActions: ['recordaudio', 'speak'] },
      { number: 59552, name: 'Volume', category: 'utilities', description: 'Volume control', colorCompatibility: true, commonActions: ['setvolume'] },

      // Apps & Services
      { number: 59553, name: 'App Store', category: 'apps', description: 'App Store "A" icon', colorCompatibility: true, commonActions: ['openapp'] },
      { number: 59554, name: 'Safari', category: 'apps', description: 'Safari compass icon', colorCompatibility: true, commonActions: ['openurl'] },
      { number: 59555, name: 'Messages', category: 'apps', description: 'Messages speech bubble', colorCompatibility: true, commonActions: ['sendmessage'] },
      { number: 59556, name: 'Phone App', category: 'apps', description: 'Phone app icon', colorCompatibility: true, commonActions: ['makephonecall'] },

      // Special & System
      { number: 59557, name: 'Home', category: 'system', description: 'Home icon', colorCompatibility: true, commonActions: ['home'] },
      { number: 59558, name: 'Lock', category: 'system', description: 'Lock icon', colorCompatibility: true, commonActions: ['lockscreen'] },
      { number: 59559, name: 'Power', category: 'system', description: 'Power button', colorCompatibility: true, commonActions: ['shutdown', 'restart'] },
      { number: 59560, name: 'Settings Advanced', category: 'system', description: 'Advanced settings', colorCompatibility: true, commonActions: ['setdnd'] },

      // Additional Common Glyphs
      { number: 59561, name: 'Star', category: 'ui', description: 'Star icon', colorCompatibility: true, commonActions: ['favorite'] },
      { number: 59562, name: 'Flag', category: 'ui', description: 'Flag icon', colorCompatibility: true, commonActions: ['mark'] },
      { number: 59563, name: 'Tag', category: 'ui', description: 'Price tag', colorCompatibility: true, commonActions: ['tag'] },
      { number: 59564, name: 'Bookmark', category: 'ui', description: 'Bookmark icon', colorCompatibility: true, commonActions: ['bookmark'] },

      // Data & Analytics
      { number: 59565, name: 'Chart', category: 'data', description: 'Bar chart', colorCompatibility: true, commonActions: ['showchart'] },
      { number: 59566, name: 'Graph', category: 'data', description: 'Line graph', colorCompatibility: true, commonActions: ['showgraph'] },
      { number: 59567, name: 'Statistics', category: 'data', description: 'Statistics icon', colorCompatibility: true, commonActions: ['getstats'] },

      // Security & Privacy
      { number: 59568, name: 'Shield', category: 'security', description: 'Security shield', colorCompatibility: true, commonActions: ['security'] },
      { number: 59569, name: 'Key', category: 'security', description: 'Key icon', colorCompatibility: true, commonActions: ['authentication'] },
      { number: 59570, name: 'Fingerprint', category: 'security', description: 'Fingerprint', colorCompatibility: true, commonActions: ['authentication'] },

      // Social & Sharing
      { number: 59571, name: 'Share', category: 'social', description: 'Share arrow', colorCompatibility: true, commonActions: ['share'] },
      { number: 59572, name: 'Like', category: 'social', description: 'Thumbs up', colorCompatibility: true, commonActions: ['like'] },
      { number: 59573, name: 'Comment', category: 'social', description: 'Speech bubble', colorCompatibility: true, commonActions: ['comment'] },

      // Health & Fitness
      { number: 59574, name: 'Heart Rate', category: 'health', description: 'Heart rate monitor', colorCompatibility: true, commonActions: ['getheartrate'] },
      { number: 59575, name: 'Steps', category: 'health', description: 'Footsteps', colorCompatibility: true, commonActions: ['getsteps'] },
      { number: 59576, name: 'Workout', category: 'health', description: 'Dumbbell', colorCompatibility: true, commonActions: ['startworkout'] },

      // Smart Home
      { number: 59577, name: 'Home Kit', category: 'smarthome', description: 'Home icon', colorCompatibility: true, commonActions: ['homekit'] },
      { number: 59578, name: 'Light', category: 'smarthome', description: 'Light bulb', colorCompatibility: true, commonActions: ['setlight'] },
      { number: 59579, name: 'Thermostat', category: 'smarthome', description: 'Thermostat', colorCompatibility: true, commonActions: ['settemperature'] },

      // Advanced & Specialized
      { number: 59580, name: 'AR', category: 'advanced', description: 'AR cube', colorCompatibility: true, commonActions: ['ar'] },
      { number: 59581, name: 'Machine Learning', category: 'advanced', description: 'Brain/neural network', colorCompatibility: true, commonActions: ['ml', 'ai'] },
      { number: 59582, name: 'Blockchain', category: 'advanced', description: 'Blockchain link', colorCompatibility: true, commonActions: ['blockchain'] },

      // Default/Fallback
      { number: 59583, name: 'Generic', category: 'generic', description: 'Generic app icon', colorCompatibility: true, commonActions: ['generic'] },
      { number: 59584, name: 'Circle', category: 'generic', description: 'Plain circle', colorCompatibility: true, commonActions: ['generic'] },
      { number: 59585, name: 'Square', category: 'generic', description: 'Plain square', colorCompatibility: true, commonActions: ['generic'] }
    ];

    glyphs.forEach(glyph => {
      this.glyphMap.set(glyph.number, glyph);
    });
  }

  private initializeActionGlyphMappings() {
    // Map common action identifiers to appropriate glyph numbers
    const actionGlyphMappings = {
      // Text actions
      'is.workflow.actions.gettext': 59511, // Text Bubble
      'is.workflow.actions.settext': 59511,

      // Communication
      'is.workflow.actions.sendmessage': 59512, // Chat
      'is.workflow.actions.sendemail': 59513, // Mail
      'is.workflow.actions.makephonecall': 59514, // Phone

      // Media
      'is.workflow.actions.playmusic': 59515, // Play
      'is.workflow.actions.pausemusic': 59516, // Pause
      'is.workflow.actions.stop': 59517, // Stop
      'is.workflow.actions.recordaudio': 59518, // Record

      // Location
      'is.workflow.actions.getcurrentlocation': 59519, // Location
      'is.workflow.actions.showmap': 59520, // Map
      'is.workflow.actions.getdirections': 59521, // Direction

      // Web
      'is.workflow.actions.url': 59522, // Globe
      'is.workflow.actions.getcontentsofurl': 59524, // Download
      'is.workflow.actions.searchweb': 59523, // Search

      // Device
      'is.workflow.actions.setbrightness': 59525, // Settings
      'is.workflow.actions.setwifi': 59527, // Wi-Fi
      'is.workflow.actions.setbluetooth': 59528, // Bluetooth

      // Camera
      'is.workflow.actions.takephoto': 59529, // Camera
      'is.workflow.actions.selectphoto': 59530, // Photo

      // Media
      'is.workflow.actions.playmusic': 59531, // Music Note
      'is.workflow.actions.recordvideo': 59532, // Video

      // Data
      'is.workflow.actions.date': 59533, // Calendar
      'is.workflow.actions.time': 59534, // Clock
      'is.workflow.actions.calculate': 59535, // Calculator
      'is.workflow.actions.getcurrentweather': 59536, // Weather

      // Scripting
      'is.workflow.actions.runscript': 59537, // Code
      'is.workflow.actions.conditional': 59538, // Logic
      'is.workflow.actions.repeat': 59539, // Loop
      'is.workflow.actions.setvariable': 59540, // Variable
      'is.workflow.actions.getvariable': 59540, // Variable

      // Files
      'is.workflow.actions.createnote': 59541, // Document
      'is.workflow.actions.getfile': 59542, // Folder
      'is.workflow.actions.createpdf': 59543, // PDF

      // UI
      'is.workflow.actions.showalert': 59545, // Alert
      'is.workflow.actions.askforinput': 59546, // Question
      'is.workflow.actions.showresult': 59547, // Checkmark

      // Utilities
      'is.workflow.actions.copy': 59549, // Clipboard
      'is.workflow.actions.getclipboard': 59549, // Clipboard
      'is.workflow.actions.speak': 59550, // Speaker
      'is.workflow.actions.recordaudio': 59551, // Microphone
      'is.workflow.actions.setvolume': 59552, // Volume

      // Apps
      'is.workflow.actions.openapp': 59553, // App Store
      'is.workflow.actions.notification': 59511, // Text Bubble (good for notifications)

      // System
      'is.workflow.actions.setdnd': 59560, // Settings Advanced
      'is.workflow.actions.lockscreen': 59558, // Lock

      // Additional mappings
      'is.workflow.actions.wait': 59534, // Clock
      'is.workflow.actions.exit': 59517, // Stop
      'is.workflow.actions.comment': 59573, // Comment
    };

    Object.entries(actionGlyphMappings).forEach(([action, glyph]) => {
      this.actionToGlyphMap.set(action, glyph);
    });
  }

  getGlyphInfo(glyphNumber: number): GlyphInfo | undefined {
    return this.glyphMap.get(glyphNumber);
  }

  getGlyphForAction(actionIdentifier: string): number {
    // First try direct mapping
    const directGlyph = this.actionToGlyphMap.get(actionIdentifier);
    if (directGlyph) {
      return directGlyph;
    }

    // Try to infer from action type
    const actionType = this.inferActionType(actionIdentifier);
    return this.getDefaultGlyphForCategory(actionType);
  }

  private inferActionType(actionIdentifier: string): string {
    const id = actionIdentifier.toLowerCase();

    if (id.includes('text') || id.includes('string')) return 'text';
    if (id.includes('notification') || id.includes('alert')) return 'ui';
    if (id.includes('message') || id.includes('mail') || id.includes('email') || id.includes('phone')) return 'communication';
    if (id.includes('url') || id.includes('web') || id.includes('search')) return 'web';
    if (id.includes('location') || id.includes('map') || id.includes('direction')) return 'location';
    if (id.includes('wifi') || id.includes('bluetooth') || id.includes('brightness') || id.includes('dnd')) return 'device';
    if (id.includes('camera') || id.includes('photo')) return 'camera';
    if (id.includes('music') || id.includes('play') || id.includes('pause') || id.includes('stop') || id.includes('record') || id.includes('speak') || id.includes('volume')) return 'media';
    if (id.includes('date') || id.includes('time') || id.includes('weather') || id.includes('calculate')) return 'data';
    if (id.includes('script') || id.includes('javascript') || id.includes('conditional') || id.includes('if') || id.includes('repeat') || id.includes('loop') || id.includes('variable')) return 'scripting';
    if (id.includes('note') || id.includes('document') || id.includes('file') || id.includes('pdf') || id.includes('folder')) return 'files';
    if (id.includes('copy') || id.includes('clipboard')) return 'utilities';
    if (id.includes('app') || id.includes('open')) return 'apps';
    if (id.includes('ask') || id.includes('input') || id.includes('result')) return 'ui';

    return 'generic';
  }

  private getDefaultGlyphForCategory(category: string): number {
    const defaultGlyphs: Record<string, number> = {
      'text': 59511,
      'ui': 59547,
      'communication': 59512,
      'web': 59522,
      'location': 59519,
      'device': 59525,
      'camera': 59529,
      'media': 59515,
      'data': 59535,
      'scripting': 59537,
      'files': 59541,
      'utilities': 59549,
      'apps': 59553,
      'generic': 59583
    };

    return defaultGlyphs[category] || 59583; // Default to generic
  }

  getAllGlyphs(): GlyphInfo[] {
    return Array.from(this.glyphMap.values());
  }

  getGlyphsByCategory(category: string): GlyphInfo[] {
    return this.getAllGlyphs().filter(glyph => glyph.category === category);
  }

  getCategories(): string[] {
    return [...new Set(this.getAllGlyphs().map(glyph => glyph.category))];
  }

  generateIconSuggestion(actionIdentifier: string, actionName?: string): {
    glyph: number;
    glyphInfo: GlyphInfo;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  } {
    // Get the suggested glyph
    const glyph = this.getGlyphForAction(actionIdentifier);
    const glyphInfo = this.getGlyphInfo(glyph);

    if (!glyphInfo) {
      return {
        glyph: 59583, // Default generic
        glyphInfo: this.getGlyphInfo(59583)!,
        confidence: 'low',
        reason: 'No specific mapping found, using default generic icon'
      };
    }

    // Check if we have a direct mapping
    const directMapping = this.actionToGlyphMap.has(actionIdentifier);

    return {
      glyph,
      glyphInfo,
      confidence: directMapping ? 'high' : 'medium',
      reason: directMapping
        ? `Direct mapping found for ${actionIdentifier}`
        : `Inferred from action type "${this.inferActionType(actionIdentifier)}"`
    };
  }

  exportGlyphDatabase(): any {
    return {
      glyphs: Object.fromEntries(this.glyphMap),
      actionMappings: Object.fromEntries(this.actionToGlyphMap),
      categories: this.getCategories(),
      stats: {
        totalGlyphs: this.glyphMap.size,
        totalMappings: this.actionToGlyphMap.size
      }
    };
  }

  importGlyphDatabase(data: any): void {
    if (data.glyphs) {
      this.glyphMap = new Map(Object.entries(data.glyphs));
    }
    if (data.actionMappings) {
      this.actionToGlyphMap = new Map(Object.entries(data.actionMappings));
    }
  }

  suggestColorForGlyph(glyphNumber: number): string {
    const glyph = this.getGlyphInfo(glyphNumber);
    if (!glyph) return '431817727'; // Default blue

    // Suggest colors based on category
    const colorMap: Record<string, string> = {
      'text': '431817727', // Blue
      'communication': '4280286208', // Green
      'web': '4286833817', // Orange
      'location': '4281348876', // Red
      'device': '4285513727', // Purple
      'camera': '4287707776', // Pink
      'media': '4287707776', // Pink
      'data': '4285513727', // Purple
      'scripting': '4285513727', // Purple
      'files': '4280286208', // Green
      'utilities': '4285513727', // Purple
      'apps': '4286833817', // Orange
      'ui': '431817727', // Blue
      'system': '4285513727', // Purple
      'generic': '431817727' // Blue
    };

    return colorMap[glyph.category] || '431817727';
  }
}