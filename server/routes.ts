import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { validateShortcut, SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { Shortcut } from '../client/src/lib/shortcuts';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-sonnet-20240229" which was released February 29, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const SYSTEM_PROMPT = `You are an iOS Shortcuts expert. You can create shortcuts based on natural language descriptions.

Example valid shortcut:
{
  "name": "Good Morning Notification",
  "actions": [
    {
      "type": "notification",
      "parameters": {
        "title": "Good Morning!",
        "body": "Have a great day!",
        "sound": true
      }
    }
  ]
}

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
  Parameters: { device: string }`;

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
      // Filter out permission-related errors since they're now warnings
      const nonPermissionErrors = errors.filter(err => !err.includes('Permissions:'));
      if (nonPermissionErrors.length > 0) {
        return { valid: false, error: nonPermissionErrors.join(', ') };
      }
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
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.7,
            messages: [
              { 
                role: "system", 
                content: type === 'generate' 
                  ? SYSTEM_PROMPT + "\nRespond ONLY with a valid JSON shortcut object following the exact structure from the example."
                  : SYSTEM_PROMPT + "\nAnalyze the shortcut and respond with improvement suggestions in JSON format."
              },
              { 
                role: "user", 
                content: type === 'generate'
                  ? `Create a shortcut that ${prompt}. Return only valid JSON in this exact format:
{
  "name": "Shortcut Name",
  "actions": [
    {
      "type": "notification",
      "parameters": {
        "title": "Title",
        "body": "Message",
        "sound": true
      }
    }
  ]
}`
                  : `Analyze this shortcut and suggest improvements: ${prompt}`
              }
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
            try {
              JSON.parse(content);
              result = { content };
            } catch (error) {
              return res.status(422).json({
                error: 'Invalid JSON response from analysis'
              });
            }
          }
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || error.message;
          return res.status(500).json({
            error: `OpenAI API Error: ${errorMessage}`
          });
        }
      } else if (model === 'claude-3-5-sonnet-20241022') {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: type === 'generate'
                ? `Create a shortcut that ${prompt}. Return ONLY valid JSON in this exact format:
{
  "name": "Shortcut Name",
  "actions": [
    {
      "type": "action_type",
      "parameters": {
        "param1": "value1"
      }
    }
  ]
}`
                : `Analyze this shortcut and suggest improvements: ${prompt}`
            }],
            temperature: 0.7,
            system: type === 'generate' 
              ? SYSTEM_PROMPT + "\nRespond ONLY with valid JSON that matches the Shortcut interface structure."
              : SYSTEM_PROMPT + "\nAnalyze shortcuts and provide improvements in JSON format."
          });

          // Safely extract and verify response
          const content = response.content?.[0]?.text;
          if (!content) {
            throw new Error('Empty response from Claude');
          }

          // Extract JSON if wrapped in code blocks
          const jsonMatch = content.match(/```json\n?(.*)\n?```/s) || content.match(/{.*}/s);
          const cleanContent = jsonMatch ? jsonMatch[1].trim() : content.trim();
          
          if (type === 'generate') {
            try {
              // Verify it's valid JSON before validation
              JSON.parse(cleanContent);
              const validation = validateAIResponse(cleanContent);
              if (!validation.valid) {
                return res.status(422).json({
                  error: `Invalid shortcut generated: ${validation.error}`
                });
              }
              result = { content: cleanContent };
            } catch (error) {
              return res.status(422).json({
                error: 'Invalid JSON response from Claude'
              });
            }
          } else {
            try {
              JSON.parse(cleanContent);
              result = { content: cleanContent };
            } catch (error) {
              return res.status(422).json({
                error: 'Invalid JSON response from analysis'
              });
            }
          }
        } catch (error: any) {
          const errorMessage = error?.response?.body?.error?.message || error.message;
          return res.status(500).json({
            error: `Claude API Error: ${errorMessage}`
          });
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
