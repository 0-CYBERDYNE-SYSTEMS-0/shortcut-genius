import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { validateShortcut, SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { Shortcut } from '../client/src/lib/shortcuts';
import { analyzeShortcut } from '../client/src/lib/shortcut-analyzer';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released February 29, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const SYSTEM_PROMPT = `You are an iOS Shortcuts expert who specializes in reverse engineering and optimizing shortcuts.

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
${Object.entries(SHORTCUT_ACTIONS).map(([type, config]) => `
- ${config.name}: ${type}
  Parameters: ${config.parameters.join(', ')}
`).join('\n')}

When analyzing shortcuts, consider:
1. Pattern detection - identify repeated actions and common parameter usage
2. Data flow analysis - track how data moves between actions
3. Complexity metrics - evaluate nesting depth and conditional logic
4. Security implications - assess potential risks and permissions
5. Optimization opportunities - suggest performance and structure improvements

Response format for analysis:
{
  "patterns": [{ "type": string, "frequency": number, "context": string }],
  "dependencies": [{ "action": string, "dependencies": string[], "dependents": string[] }],
  "optimizations": [{ "type": string, "description": string, "impact": "high"|"medium"|"low" }],
  "security": [{ "type": string, "risk": "high"|"medium"|"low", "description": string }],
  "permissions": [{ "permission": string, "required": boolean, "reason": string }]
}`;

function cleanJSONString(str: string): string {
  // Remove any markdown code block syntax
  let cleaned = str.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1');
  
  // Remove any leading/trailing whitespace and newlines
  cleaned = cleaned.trim();
  
  // Ensure the string starts with { and ends with }
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
  }
  
  return cleaned;
}

function validateAndParseJSON(content: string, type: 'generate' | 'analyze'): { valid: boolean; data?: any; error?: string } {
  try {
    const cleanedContent = cleanJSONString(content);
    const parsed = JSON.parse(cleanedContent);
    
    // Validate structure based on type
    if (type === 'generate') {
      if (!parsed.name || !Array.isArray(parsed.actions)) {
        return { valid: false, error: 'Invalid shortcut structure: missing name or actions array' };
      }
    } else {
      // Validate analysis structure
      if (!parsed.patterns || !Array.isArray(parsed.patterns) ||
          !parsed.dependencies || !Array.isArray(parsed.dependencies) ||
          !parsed.optimizations || !Array.isArray(parsed.optimizations)) {
        return { valid: false, error: 'Invalid analysis structure: missing required arrays' };
      }
    }
    
    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid JSON structure' };
  }
}

// Update the ContentBlock interface at the top of the file
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: any;
}

type ContentBlock = TextBlock | ToolUseBlock;

interface ProcessResult {
  content: string;
  localAnalysis?: any;
  error?: string;
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
                  : SYSTEM_PROMPT + "\nAnalyze the shortcut and respond with a valid JSON analysis object."
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
          const validation = validateAndParseJSON(content, type);
          
          if (!validation.valid) {
            return res.status(422).json({
              error: `Invalid ${type === 'generate' ? 'shortcut' : 'analysis'} generated: ${validation.error}`
            });
          }
          
          result = { content: JSON.stringify(validation.data) };
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || error.message;
          return res.status(500).json({
            error: `OpenAI API Error: ${errorMessage}`
          });
        }
      } else if (model === 'claude-3-5-sonnet-20241022') {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            system: type === 'generate' 
              ? SYSTEM_PROMPT + "\nRespond ONLY with a valid JSON shortcut object."
              : SYSTEM_PROMPT + "\nAnalyze the shortcut and respond with a valid JSON analysis object.",
            messages: [{ 
              role: 'user', 
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
                : `Analyze this shortcut in detail: ${prompt}`
            }],
            temperature: 0.7,
            max_tokens: 4000
          });

          const messageContent = response.content[0] as TextBlock;
          if (!messageContent || messageContent.type !== 'text' || !messageContent.text) {
            throw new Error('Empty or invalid response from Claude');
          }
          
          const validation = validateAndParseJSON(messageContent.text, type);
          if (!validation.valid) {
            return res.status(422).json({
              error: `Invalid ${type === 'generate' ? 'shortcut' : 'analysis'} generated: ${validation.error}`
            });
          }
          
          result = { content: JSON.stringify(validation.data) } as ProcessResult;
          
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
      
      // For analysis requests, also include our local analysis
      if (type === 'analyze' && result?.content) {
        try {
          const shortcut = JSON.parse(result.content);
          const localAnalysis = analyzeShortcut(shortcut);
          result.localAnalysis = localAnalysis;
        } catch (error) {
          console.error('Failed to perform local analysis:', error);
        }
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


//hello