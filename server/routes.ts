import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { validateShortcut, SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { Shortcut } from '../client/src/lib/shortcuts';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const SYSTEM_PROMPT = `You are an iOS Shortcuts expert. You can create shortcuts based on natural language descriptions.

Available shortcut actions:

Text & Input:
- Text: Creates text content
  Parameters: { text: string }
- Number: Creates a numeric value
  Parameters: { value: number }
- Ask for Input: Prompts the user for input
  Parameters: { prompt: string, defaultValue?: string }

Control Flow:
- If/Then/Else: Conditional logic
  Parameters: { condition: string, then: Action[], else?: Action[] }
- Repeat: Loop through items
  Parameters: { count: number, actions: Action[] }
- Wait: Pause execution
  Parameters: { seconds: number }

Media:
- Play Sound: Play an audio file
  Parameters: { soundName: string, volume?: number }
- Record Audio: Record audio input
  Parameters: { duration: number, quality: "low" | "medium" | "high" }
- Take Photo: Capture photo
  Parameters: { useFrontCamera?: boolean, flash?: "on" | "off" | "auto" }
- Select Photos: Choose photos from library
  Parameters: { allowMultiple?: boolean, includeVideos?: boolean }

Device:
- Set Volume: Adjust device volume
  Parameters: { level: number }
- Set Brightness: Adjust screen brightness
  Parameters: { level: number }
- Set Do Not Disturb: Toggle DND mode
  Parameters: { enabled: boolean, duration?: number }

System:
- URL: Make web requests
  Parameters: { url: string, method?: "GET" | "POST", headers?: object }
- Notifications: Show alerts
  Parameters: { title: string, body: string, sound?: boolean }
- Files: Read/Write files
  Parameters: { path: string, content?: string, operation: "read" | "write" | "append" }

Calendar & Contacts:
- Calendar: Access calendar events
  Parameters: { action: "create" | "read" | "update", title?: string, date?: string }
- Contacts: Access contact info
  Parameters: { action: "create" | "read" | "update", name?: string, phone?: string }

Location & Maps:
- Get Location: Get current location
  Parameters: { accuracy: "best" | "reduced" }
- Get Directions: Get navigation info
  Parameters: { destination: string, mode: "driving" | "walking" | "transit" }

Health:
- Log Health Data: Record health metrics
  Parameters: { type: "steps" | "weight" | "heart-rate", value: number, unit: string }
- Get Health Samples: Retrieve health data
  Parameters: { type: string, startDate: string, endDate: string }

Home:
- Control Devices: Manage HomeKit devices
  Parameters: { device: string, action: "on" | "off" | "toggle", value?: number }
- Get Device State: Check device status
  Parameters: { device: string }

Example Shortcuts:

1. Morning Routine:
{
  "name": "Good Morning",
  "actions": [
    {
      "type": "get_location",
      "parameters": { "accuracy": "reduced" }
    },
    {
      "type": "url",
      "parameters": { 
        "url": "https://api.weather.com/v1/forecast",
        "method": "GET"
      }
    },
    {
      "type": "set_brightness",
      "parameters": { "level": 75 }
    },
    {
      "type": "play_sound",
      "parameters": { 
        "soundName": "morning_playlist",
        "volume": 50
      }
    }
  ]
}

2. Workout Tracker:
{
  "name": "Log Workout",
  "actions": [
    {
      "type": "ask",
      "parameters": {
        "prompt": "What type of workout?",
        "defaultValue": "Running"
      }
    },
    {
      "type": "log_health",
      "parameters": {
        "type": "workout",
        "value": 30,
        "unit": "minutes"
      }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Workout Logged",
        "body": "Great job staying active!",
        "sound": true
      }
    }
  ]
}

3. Smart Home Evening:
{
  "name": "Evening Mode",
  "actions": [
    {
      "type": "control_devices",
      "parameters": {
        "device": "Living Room Lights",
        "action": "on",
        "value": 30
      }
    },
    {
      "type": "set_do_not_disturb",
      "parameters": {
        "enabled": true,
        "duration": 480
      }
    }
  ]
}

When generating a shortcut:
1. Convert natural language into a valid shortcut structure
2. Use appropriate actions and parameters from the available list
3. Return a JSON object with:
  - name: Shortcut name (string)
  - actions: Array of action objects
    - type: Action type (string)
    - parameters: Action parameters (object)`;

function validateAIResponse(content: string): { valid: boolean; error?: string; shortcut?: Shortcut } {
  try {
    const parsed = JSON.parse(content);
    
    // Check basic structure
    if (!parsed.name || !Array.isArray(parsed.actions)) {
      return { valid: false, error: 'Invalid shortcut structure: missing name or actions array' };
    }

    // Create shortcut object
    const shortcut: Shortcut = {
      name: parsed.name,
      actions: parsed.actions
    };

    // Validate using existing validator
    const errors = validateShortcut(shortcut);
    if (errors.length > 0) {
      return { valid: false, error: errors.join(', ') };
    }

    return { valid: true, shortcut };
  } catch (error) {
    return { valid: false, error: 'Failed to parse AI response as JSON' };
  }
}

export function registerRoutes(app: Express) {
  app.post('/api/process', async (req, res) => {
    const { model, prompt, type = 'analyze' } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    try {
      let result;
      if (model === 'gpt-4o') {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: type === 'generate' ? SYSTEM_PROMPT : "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields." 
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0].message.content || '';
        
        if (type === 'generate') {
          const validation = validateAIResponse(content);
          if (!validation.valid) {
            return res.status(422).json({
              error: `Invalid shortcut generated: ${validation.error}`
            });
          }
          result = { content };
        } else {
          result = { content };
        }
      } else if (model === 'claude-3-5-sonnet-20241022') {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: type === 'generate' ? SYSTEM_PROMPT : "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields.",
          messages: [{ role: 'user', content: prompt }]
        });
        
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        
        if (type === 'generate') {
          const validation = validateAIResponse(content);
          if (!validation.valid) {
            return res.status(422).json({
              error: `Invalid shortcut generated: ${validation.error}`
            });
          }
          result = { content };
        } else {
          result = { content };
        }
      } else {
        return res.status(400).json({
          error: 'Invalid model specified'
        });
      }
      
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        error: `Error processing with ${model}: ${errorMessage}`
      });
    }
  });
}
