import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const SYSTEM_PROMPT = `You are an iOS Shortcuts expert. You can create shortcuts based on natural language descriptions.

Available shortcut actions:
- Text: Creates text content
- Number: Creates a numeric value
- Ask for Input: Prompts the user for input
- Conditional: If/Then logic
- Repeat: Loop through items
- Variables: Store and retrieve values
- URL: Make web requests
- Notifications: Show alerts
- Files: Read/Write files
- Calendar: Access calendar events
- Contacts: Access contact info
- Location: Get location data
- Maps: Get directions
- Music: Control audio playback
- Photos: Access photo library

When generating a shortcut:
1. Convert natural language into a valid shortcut structure
2. Use appropriate actions and parameters
3. Return a JSON object with:
  - name: Shortcut name
  - actions: Array of action objects
    - type: Action type
    - parameters: Action parameters

Example response:
{
  "name": "Morning Routine",
  "actions": [
    {
      "type": "text",
      "parameters": {
        "text": "Good morning!"
      }
    },
    {
      "type": "ask",
      "parameters": {
        "prompt": "How did you sleep?",
        "defaultValue": "Well"
      }
    }
  ]
}`;

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
            { role: "system", content: type === 'generate' ? SYSTEM_PROMPT : "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        result = { content: response.choices[0].message.content || '' };
      } else if (model === 'claude-3-5-sonnet-20241022') {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: type === 'generate' ? SYSTEM_PROMPT : "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields.",
          messages: [{ role: 'user', content: prompt }]
        });
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        result = { content };
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
