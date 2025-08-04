import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { validateShortcut, SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { Shortcut } from '../client/src/lib/shortcuts';
import { analyzeShortcut } from '../client/src/lib/shortcut-analyzer';
import { responseCache } from './cache';
import { openAICircuitBreaker, anthropicCircuitBreaker } from './circuit-breaker';
import { modelRouter } from './model-router';

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
    const { model: requestedModel, prompt, type = 'analyze' } = req.body;
    
    // Use intelligent model routing
    const routing = modelRouter.routeModel(prompt, type, requestedModel);
    const model = routing.model;
    
    console.log(`Model routing: ${routing.reasoning} (confidence: ${Math.round(routing.confidence * 100)}%)`);
    
    // Add routing info to response headers for debugging
    res.set({
      'X-Model-Selected': model,
      'X-Model-Confidence': routing.confidence.toString(),
      'X-Model-Reasoning': routing.reasoning,
      'X-Model-Override': routing.wasOverridden.toString()
    });
    
    // Enhanced input validation and security
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate model selection
    const allowedModels = ['gpt-4o', 'claude-3-5-sonnet-20241022'];
    if (!allowedModels.includes(model)) {
      return res.status(400).json({
        error: 'Invalid model specified'
      });
    }

    // Validate request type
    const allowedTypes = ['generate', 'analyze'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type specified'
      });
    }

    // Input length validation
    if (prompt.length > 10000) {
      return res.status(400).json({
        error: 'Prompt too long (max 10000 characters)'
      });
    }

    // Basic content safety check
    const suspiciousPatterns = /\b(api[_-]?key|secret|token|password|auth)\b/i;
    if (suspiciousPatterns.test(prompt)) {
      return res.status(400).json({
        error: 'Prompt contains potentially sensitive information'
      });
    }

    // Check for API key availability
    if (model === 'gpt-4o' && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'OpenAI service unavailable - API key not configured'
      });
    }

    if (model === 'claude-3-5-sonnet-20241022' && !process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'Anthropic service unavailable - API key not configured'
      });
    }

    try {
      // Track request start time for performance monitoring
      res.locals.startTime = Date.now();
      
      // Check cache first
      const cachedResult = responseCache.get(model, prompt, type);
      if (cachedResult) {
        console.log(`Cache hit for ${model}:${type}`);
        return res.json({
          content: cachedResult.content,
          localAnalysis: cachedResult.localAnalysis,
          cached: true
        });
      }

      let result: ProcessResult;
      
      // For analysis requests, run AI analysis and local analysis in parallel
      if (type === 'analyze') {
        try {
          // Parse input shortcut for local analysis
          const inputShortcut = JSON.parse(prompt);
          
          // Run AI analysis and local analysis in parallel
          const [aiResult, localAnalysis] = await Promise.all([
            // AI Analysis with Circuit Breaker
            (async () => {
              if (model === 'gpt-4o') {
                return await openAICircuitBreaker.execute(
                  async () => {
                    const response = await openai.chat.completions.create({
                      model: "gpt-4o",
                      temperature: 0.7,
                      messages: [
                        { 
                          role: "system", 
                          content: SYSTEM_PROMPT + "\nAnalyze the shortcut and respond with a valid JSON analysis object."
                        },
                        { 
                          role: "user", 
                          content: `Analyze this shortcut and suggest improvements: ${prompt}`
                        }
                      ],
                      response_format: { type: "json_object" }
                    });
                    
                    const content = response.choices[0].message.content || '';
                    const validation = validateAndParseJSON(content, type);
                    
                    if (!validation.valid) {
                      throw new Error(`Invalid analysis generated: ${validation.error}`);
                    }
                    
                    return JSON.stringify(validation.data);
                  },
                  // Fallback to local analysis only
                  async () => {
                    console.log('OpenAI circuit breaker open - using local analysis only');
                    return JSON.stringify({
                      patterns: [],
                      dependencies: [],
                      optimizations: [{ type: "service_unavailable", description: "AI analysis temporarily unavailable, showing local analysis only", impact: "low" }],
                      security: [],
                      permissions: []
                    });
                  }
                );
              } else if (model === 'claude-3-5-sonnet-20241022') {
                return await anthropicCircuitBreaker.execute(
                  async () => {
                    const response = await anthropic.messages.create({
                      model: 'claude-3-5-sonnet-20241022',
                      system: SYSTEM_PROMPT + "\nAnalyze the shortcut and respond with a valid JSON analysis object.",
                      messages: [{ 
                        role: 'user', 
                        content: `Analyze this shortcut in detail: ${prompt}`
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
                      throw new Error(`Invalid analysis generated: ${validation.error}`);
                    }
                    
                    return JSON.stringify(validation.data);
                  },
                  // Fallback to local analysis only
                  async () => {
                    console.log('Anthropic circuit breaker open - using local analysis only');
                    return JSON.stringify({
                      patterns: [],
                      dependencies: [],
                      optimizations: [{ type: "service_unavailable", description: "AI analysis temporarily unavailable, showing local analysis only", impact: "low" }],
                      security: [],
                      permissions: []
                    });
                  }
                );
              } else {
                throw new Error('Invalid model specified');
              }
            })(),
            // Local Analysis
            (async () => {
              return analyzeShortcut(inputShortcut);
            })()
          ]);
          
          result = { 
            content: aiResult, 
            localAnalysis 
          };
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || 
                             error?.response?.body?.error?.message || 
                             error.message;
          return res.status(500).json({
            error: `AI Analysis Error: ${errorMessage}`
          });
        }
      } else {
        // Generation requests with circuit breaker protection
        if (model === 'gpt-4o') {
          try {
            const content = await openAICircuitBreaker.execute(
              async () => {
                const response = await openai.chat.completions.create({
                  model: "gpt-4o",
                  temperature: 0.7,
                  messages: [
                    { 
                      role: "system", 
                      content: SYSTEM_PROMPT + "\nRespond ONLY with a valid JSON shortcut object following the exact structure from the example."
                    },
                    { 
                      role: "user", 
                      content: `Create a shortcut that ${prompt}. Return only valid JSON in this exact format:
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
                    }
                  ],
                  response_format: { type: "json_object" }
                });
                
                return response.choices[0].message.content || '';
              },
              // Fallback for generation
              async () => {
                console.log('OpenAI circuit breaker open - providing basic shortcut template');
                return JSON.stringify({
                  name: "Service Unavailable - Template Shortcut",
                  actions: [{
                    type: "notification",
                    parameters: {
                      title: "AI Service Unavailable",
                      body: "Please try again later or edit this template manually",
                      sound: false
                    }
                  }]
                });
              }
            );
            
            const validation = validateAndParseJSON(content, type);
            
            if (!validation.valid) {
              return res.status(422).json({
                error: `Invalid shortcut generated: ${validation.error}`
              });
            }
            
            result = { content: JSON.stringify(validation.data) };
            
          } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error';
            return res.status(500).json({
              error: `OpenAI API Error: ${errorMessage}`
            });
          }
        } else if (model === 'claude-3-5-sonnet-20241022') {
          try {
            const content = await anthropicCircuitBreaker.execute(
              async () => {
                const response = await anthropic.messages.create({
                  model: 'claude-3-5-sonnet-20241022',
                  system: SYSTEM_PROMPT + "\nRespond ONLY with a valid JSON shortcut object.",
                  messages: [{ 
                    role: 'user', 
                    content: `Create a shortcut that ${prompt}. Return only valid JSON in this exact format:
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
                  }],
                  temperature: 0.7,
                  max_tokens: 4000
                });

                const messageContent = response.content[0] as TextBlock;
                if (!messageContent || messageContent.type !== 'text' || !messageContent.text) {
                  throw new Error('Empty or invalid response from Claude');
                }
                
                return messageContent.text;
              },
              // Fallback for generation
              async () => {
                console.log('Anthropic circuit breaker open - providing basic shortcut template');
                return JSON.stringify({
                  name: "Service Unavailable - Template Shortcut",
                  actions: [{
                    type: "notification",
                    parameters: {
                      title: "AI Service Unavailable",
                      body: "Please try again later or edit this template manually",
                      sound: false
                    }
                  }]
                });
              }
            );
            
            const validation = validateAndParseJSON(content, type);
            if (!validation.valid) {
              return res.status(422).json({
                error: `Invalid shortcut generated: ${validation.error}`
              });
            }
            
            result = { content: JSON.stringify(validation.data) };
            
          } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error';
            return res.status(500).json({
              error: `Claude API Error: ${errorMessage}`
            });
          }
        } else {
          return res.status(400).json({
            error: 'Invalid model specified'
          });
        }
      }
      
      // Store result in cache
      responseCache.set(model, prompt, type, result.content, result.localAnalysis);
      console.log(`Cached result for ${model}:${type}`);
      
      // Update model performance tracking
      modelRouter.updatePerformance(model, Date.now() - res.locals.startTime, true);
      
      res.json(result);
    } catch (error) {
      // Track failure for performance monitoring
      if (res.locals.startTime) {
        modelRouter.updatePerformance(model, Date.now() - res.locals.startTime, false);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        error: `Error processing with ${model}: ${errorMessage}`
      });
    }
  });

  // Performance monitoring endpoint
  app.get('/api/stats', (req, res) => {
    const modelStats = modelRouter.getModelStats();
    const cacheStats = responseCache.getStats();
    const circuitBreakerStats = {
      openai: openAICircuitBreaker.getStats(),
      anthropic: anthropicCircuitBreaker.getStats()
    };

    res.json({
      timestamp: new Date().toISOString(),
      models: modelStats,
      cache: cacheStats,
      circuitBreakers: circuitBreakerStats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const circuitBreakerStatus = {
      openai: openAICircuitBreaker.getStats().state,
      anthropic: anthropicCircuitBreaker.getStats().state
    };

    const isHealthy = Object.values(circuitBreakerStatus).every(state => state !== 'OPEN');

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured'
      },
      circuitBreakers: circuitBreakerStatus,
      uptime: process.uptime()
    });
  });
}


//hello