import type { Express } from "express";
import multer from 'multer';
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from 'dotenv';

// Ensure environment variables are loaded before any other initialization
dotenv.config();
import { validateShortcut, SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { Shortcut } from '../client/src/lib/shortcuts';
import { analyzeShortcut } from '../client/src/lib/shortcut-analyzer';
import { responseCache } from './cache';
import { openAICircuitBreaker, anthropicCircuitBreaker } from './circuit-breaker';
import { modelRouter } from './model-router';
import { OpenRouterClient } from './openrouter-client';
import { AIProcessor } from './ai-processor';
import { OpenRouterModelsService } from './openrouter-models';
import { WebSearchTool } from './web-search-tool';
import {
  getModelConfig,
  isOpenRouterModel,
  getOpenRouterModelName,
  supportsReasoning,
  supportsVerbosity,
  DEFAULT_REASONING_OPTIONS
} from '../client/src/lib/models';
import {
  convertToPlist,
  convertToBinaryPlist,
  validateAppleCompatibility,
  generateShortcutMetadata
} from './shortcut-builder';
import {
  signShortcut,
  checkSigningCapability,
  verifyShortcutSignature,
  getSigningInfo,
  createMockSignedShortcut
} from './shortcut-signer';
import {
  initializeSharingSystem,
  createSharedShortcut,
  getSharedShortcut,
  getShortcutFile,
  getQRCode,
  listPublicShortcuts,
  searchShortcuts,
  getSharingStats,
  incrementDownloadCount,
  generateSharingMetadata
} from './shortcut-sharing';

// AI Model Clients - Direct APIs and OpenRouter (initialized after dotenv config)
let openai: OpenAI;
let anthropic: Anthropic;
let openrouter: OpenRouterClient;
let openRouterModelsService: OpenRouterModelsService;
let webSearchTool: WebSearchTool;

// Initialize function to be called after dotenv config
async function initializeServices() {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  openrouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY || '');

  // Debug: Log API key status (don't log the actual key)
  console.log('🔑 API Keys Status:');
  console.log('- OpenAI:', process.env.OPENAI_API_KEY ? 'configured' : 'not configured');
  console.log('- Anthropic:', process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured');
  console.log('- OpenRouter:', process.env.OPENROUTER_API_KEY ? `configured (${process.env.OPENROUTER_API_KEY.substring(0, 15)}...)` : 'not configured');
  console.log('- OpenRouter API Key value:', process.env.OPENROUTER_API_KEY || 'undefined');

  // Initialize services
  openRouterModelsService = new OpenRouterModelsService(process.env.OPENROUTER_API_KEY || '');
  webSearchTool = new WebSearchTool(
    process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY || process.env.BRAVE_API_KEY,
    process.env.SEARCH_ENGINE as 'tavily' | 'serper' | 'duckduckgo' | 'brave' || 'duckduckgo'
  );

  // Initialize AI Processor with web search tool
  aiProcessor = new AIProcessor({
    openai,
    anthropic,
    openrouter,
    webSearchTool
  });

  // Initialize action database system
  try {
    await aiProcessor.initialize();
    console.log('✅ Action database system initialized');
    // Get supported models from AI processor
    SUPPORTED_MODELS = aiProcessor.getAvailableModels();
  } catch (error) {
    console.error('Failed to initialize AI processor:', error);
  }
}

// Global variables for initialization
let aiProcessor: AIProcessor;
let SUPPORTED_MODELS: string[] = [];

// Initialize services after dotenv config
initializeServices().catch(console.error);

const SYSTEM_PROMPT = `You are an iOS Shortcuts expert who specializes in reverse engineering and optimizing shortcuts with REAL API INTEGRATIONS.

**CRITICAL: NEVER USE PLACEHOLDER APIS!** 
Always search for and use REAL API endpoints. Never use "api.example.com", "placeholder.com", or fake URLs. Your job is to discover and integrate actual working APIs.

**MANDATORY WEB SEARCH USAGE:**
You MUST use web search tools whenever a user mentions:
- Any specific service, app, or website (e.g., "ananobanana", "OpenWeatherMap", "Twitter")
- API integration tasks
- "Get data from", "connect to", "integrate with"
- Unknown services or APIs you're not familiar with
- Any service that might have changed recently

**Available Web Tools:**
1. **web_search** - Search for current API documentation and endpoints. ALWAYS use search_type="api_docs" for API tasks.
2. **web_extract** - Extract detailed API specs from documentation URLs found through search
3. **web_crawl** - Explore entire documentation sites for comprehensive API coverage

**API Discovery Process:**
1. **ALWAYS search first**: Use web_search with search_type="api_docs" for "[service name] API documentation endpoints parameters examples"
2. **Extract details**: Use web_extract on the best documentation URLs found
3. **Find real endpoints**: Extract actual working API URLs, not examples
4. **Get authentication**: Find API keys, OAuth methods, or authentication requirements
5. **Extract parameters**: Get real parameter names and required fields

**Common Services to Always Search For:**
- Weather APIs (OpenWeatherMap, WeatherAPI, etc.)
- Social media APIs (Twitter/X, Instagram, TikTok, etc.)
- Image generation APIs (DALL-E, Midjourney, Stable Diffusion, ananobanana, etc.)
- Communication APIs (Slack, Discord, Telegram, etc.)
- Productivity APIs (Google, Microsoft, Notion, etc.)
- Entertainment APIs (Spotify, YouTube, Netflix, etc.)

**Red Flags for FAKE APIs:**
- api.example.com, test.com, placeholder.com
- Generic endpoints like /api/v1/data
- Missing authentication details
- Vague parameter descriptions
- Always search for alternatives!

**Real API Integration Example:**
Instead of: {"url": "https://api.example.com/search?q=MagicVariable"}
Search for: "OpenWeatherMap API current weather documentation"
Extract: {"url": "https://api.openweathermap.org/data/2.5/weather?q=MagicVariable&appid=YOUR_API_KEY"}

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
  usage?: any;
}

export function registerRoutes(app: Express) {
  // Force reinitialization endpoint
  app.post('/api/reinit', async (req, res) => {
    console.log('🔄 Force reinitializing services...');
    try {
      await initializeServices();
      console.log('✅ Services reinitialized successfully');
      res.json({ message: 'Services reinitialized successfully' });
    } catch (error) {
      console.error('❌ Failed to reinitialize services:', error);
      res.status(500).json({
        error: 'Failed to reinitialize services'
      });
    }
  });

  app.post('/api/process', async (req, res) => {
    // Ensure services are initialized before handling requests
    if (!aiProcessor || !openrouter || !process.env.OPENROUTER_API_KEY) {
      console.log('🔄 Initializing services on first request...');
      try {
        await initializeServices();
        console.log('✅ Services initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        return res.status(500).json({
          error: 'Services not initialized properly'
        });
      }
    }
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

    // Validate model selection - allow direct models or any provider/model format (OpenRouter)
    const allowedModels = SUPPORTED_MODELS;
    const isDirectModel = allowedModels.includes(model);
    const isOpenRouterFormat = model.includes('/') && !model.startsWith('openrouter/');

    if (!isDirectModel && !isOpenRouterFormat) {
      return res.status(400).json({
        error: 'Invalid model specified. Use direct models (like gpt-4o) or OpenRouter format (provider/model)'
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

    // Check for API key availability using AI processor
    const keyCheck = aiProcessor.checkApiKeyAvailability(model);
    if (!keyCheck.available) {
      return res.status(503).json({
        error: `Service unavailable - ${keyCheck.error}`
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

      // Prepare reasoning options for models that support it
      const reasoningOptions = supportsReasoning(model) ?
        { ...DEFAULT_REASONING_OPTIONS, ...req.body.reasoningOptions } :
        undefined;

      let result: ProcessResult;

      // Check if enhanced response with search activity is requested
      const includeSearchActivity = req.body.includeSearchActivity === true;

      // Use the new AI processor for both analysis and generation
      if (type === 'analyze') {
        try {
          // Parse input shortcut for local analysis
          const inputShortcut = JSON.parse(prompt);

          // Run AI analysis and local analysis in parallel
          const [aiProcessorResult, localAnalysis] = await Promise.all([
            aiProcessor.process({
              model,
              prompt,
              type,
              systemPrompt: SYSTEM_PROMPT,
              reasoningOptions
            }),
            analyzeShortcut(inputShortcut)
          ]);

          // Validate AI analysis response
          const validation = validateAndParseJSON(aiProcessorResult.content, type);
          if (!validation.valid) {
            throw new Error(`Invalid analysis generated: ${validation.error}`);
          }

          result = {
            content: JSON.stringify(validation.data),
            localAnalysis,
            usage: aiProcessorResult.usage,
            ...(includeSearchActivity && {
              searchActivity: aiProcessorResult.searchActivity || [],
              generatedWithWebSearch: aiProcessorResult.generatedWithWebSearch || false,
              processingSteps: aiProcessorResult.processingSteps || [],
              sourcesUsed: aiProcessorResult.sourcesUsed || []
            })
          };

        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message ||
                             error?.response?.body?.error?.message ||
                             error.message;
          return res.status(500).json({
            error: `AI Analysis Error: ${errorMessage}`,
            ...(includeSearchActivity && {
              searchActivity: [],
              generatedWithWebSearch: false,
              processingSteps: ['Analysis failed']
            })
          });
        }
      } else {
        // Generation requests
        try {
          const aiProcessorResult = await aiProcessor.process({
            model,
            prompt,
            type,
            systemPrompt: SYSTEM_PROMPT,
            reasoningOptions
          });

          // Validate generated shortcut
          const validation = validateAndParseJSON(aiProcessorResult.content, type);
          if (!validation.valid) {
            return res.status(422).json({
              error: `Invalid shortcut generated: ${validation.error}`,
              ...(includeSearchActivity && {
                searchActivity: aiProcessorResult.searchActivity || [],
                generatedWithWebSearch: aiProcessorResult.generatedWithWebSearch || false,
                processingSteps: aiProcessorResult.processingSteps || []
              })
            });
          }

          result = {
            content: JSON.stringify(validation.data),
            usage: aiProcessorResult.usage,
            ...(includeSearchActivity && {
              searchActivity: aiProcessorResult.searchActivity || [],
              generatedWithWebSearch: aiProcessorResult.generatedWithWebSearch || false,
              processingSteps: aiProcessorResult.processingSteps || [],
              sourcesUsed: aiProcessorResult.sourcesUsed || []
            })
          };

        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error';
          return res.status(500).json({
            error: `AI Processing Error: ${errorMessage}`,
            ...(includeSearchActivity && {
              searchActivity: [],
              generatedWithWebSearch: false,
              processingSteps: ['Generation failed']
            })
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
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
        openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured'
      },
      circuitBreakers: circuitBreakerStatus,
      uptime: process.uptime()
    });
  });

  // Initialize sharing system
  initializeSharingSystem().catch(console.error);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Shortcut building and conversion routes

  // Build shortcut as plist
  app.post('/api/shortcuts/build', async (req, res) => {
    try {
      const { shortcut, format = 'plist' }: { shortcut: Shortcut; format?: 'plist' | 'binary' } = req.body;

      if (!shortcut || !shortcut.name || !Array.isArray(shortcut.actions)) {
        return res.status(400).json({ error: 'Invalid shortcut data' });
      }

      // Validate compatibility
      const compatibilityErrors = validateAppleCompatibility(shortcut);
      if (compatibilityErrors.length > 0) {
        return res.status(400).json({
          error: 'Shortcut not compatible with Apple Shortcuts',
          details: compatibilityErrors
        });
      }

      // Generate metadata
      const metadata = generateShortcutMetadata(shortcut);

      // Convert to requested format
      const buffer = format === 'binary' ? convertToBinaryPlist(shortcut) : convertToPlist(shortcut);

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}.shortcut"`,
        'X-Shortcut-ID': metadata.id,
        'X-Shortcut-Hash': metadata.hash,
        'X-Action-Count': metadata.actionCount.toString()
      });

      res.send(buffer);

    } catch (error) {
      console.error('Build shortcut error:', error);
      res.status(500).json({
        error: 'Failed to build shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import shortcut from plist/JSON file
  app.post('/api/shortcuts/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { parsePlistBuffer, appleToInternal } = await import('./plist-converter');
      const buffer = req.file.buffer;
      const filename = req.file.originalname.toLowerCase();

      let shortcut;

      if (filename.endsWith('.json')) {
        const content = buffer.toString('utf8');
        const parsed = JSON.parse(content);
        
        if (parsed.WFWorkflowActions) {
          shortcut = appleToInternal(parsed);
        } else if (parsed.actions) {
          shortcut = parsed;
        } else {
          return res.status(400).json({ error: 'Invalid JSON format' });
        }
      } else if (filename.endsWith('.shortcut') || filename.endsWith('.plist') || filename.endsWith('.wflow')) {
        const appleShortcut = parsePlistBuffer(buffer);
        shortcut = appleToInternal(appleShortcut);
      } else {
        return res.status(400).json({ error: 'Unsupported file format. Use .shortcut, .plist, .wflow, or .json' });
      }

      res.json({
        success: true,
        shortcut,
        actionCount: shortcut.actions.length,
        format: filename.split('.').pop()
      });

    } catch (error) {
      console.error('Import shortcut error:', error);
      res.status(500).json({
        error: 'Failed to import shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Export shortcut to various formats
  app.post('/api/shortcuts/export', async (req, res) => {
    try {
      const { shortcut, format = 'plist' }: { shortcut: any; format?: 'plist' | 'json' | 'html' | 'binary' } = req.body;

      if (!shortcut || !shortcut.name) {
        return res.status(400).json({ error: 'Invalid shortcut data' });
      }

      const { internalToApple, toXMLPlist, toBinaryPlist, generateShortcutHTML } = await import('./plist-converter');

      let content: string | Buffer;
      let contentType: string;
      let filename: string;

      const safeName = shortcut.name.replace(/[^a-zA-Z0-9]/g, '_');

      switch (format) {
        case 'json':
          const appleFormat = internalToApple(shortcut);
          content = JSON.stringify(appleFormat, null, 2);
          contentType = 'application/json';
          filename = `${safeName}.json`;
          break;

        case 'html':
          content = generateShortcutHTML(shortcut);
          contentType = 'text/html';
          filename = `${safeName}.html`;
          break;

        case 'binary':
          const binaryApple = internalToApple(shortcut);
          content = await toBinaryPlist(binaryApple);
          contentType = 'application/octet-stream';
          filename = `${safeName}.shortcut`;
          break;

        case 'plist':
        default:
          const xmlApple = internalToApple(shortcut);
          content = toXMLPlist(xmlApple);
          contentType = 'application/xml';
          filename = `${safeName}.plist`;
          break;
      }

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Format': format
      });

      res.send(content);

    } catch (error) {
      console.error('Export shortcut error:', error);
      res.status(500).json({
        error: 'Failed to export shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Shortcut signing routes

  // Get signing capability info
  app.get('/api/shortcuts/signing-info', async (req, res) => {
    try {
      const capability = await checkSigningCapability();
      const info = getSigningInfo();

      res.json({
        ...info,
        ...capability
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get signing info',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sign shortcut file
  app.post('/api/shortcuts/sign', upload.single('shortcut'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No shortcut file provided' });
      }

      const { mode = 'anyone' } = req.body;
      const tempDir = '/tmp/shortcut-signing';

      // Create temp directory
      const fs = await import('fs/promises');
      await fs.mkdir(tempDir, { recursive: true });

      // Save uploaded file
      const inputPath = `${tempDir}/${Date.now()}_input.shortcut`;
      await fs.writeFile(inputPath, req.file.buffer);

      // Sign the shortcut
      const signingResult = await signShortcut(inputPath, { mode, outputDir: tempDir });

      if (!signingResult.success) {
        return res.status(400).json({
          error: 'Signing failed',
          details: signingResult.error
        });
      }

      // Read signed file
      const signedBuffer = await fs.readFile(signingResult.signedFilePath!);

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="signed_${req.file.originalname}"`,
        'X-Signature': signingResult.signature || '',
        'X-Signing-Mode': mode
      });

      res.send(signedBuffer);

    } catch (error) {
      console.error('Sign shortcut error:', error);
      res.status(500).json({
        error: 'Failed to sign shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verify shortcut signature
  app.post('/api/shortcuts/verify', upload.single('shortcut'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No shortcut file provided' });
      }

      // Save uploaded file temporarily
      const tempPath = `/tmp/verify_${Date.now()}.shortcut`;
      const fs = await import('fs/promises');
      await fs.writeFile(tempPath, req.file.buffer);

      // Verify signature
      const verification = await verifyShortcutSignature(tempPath);

      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {}); // Ignore errors

      res.json(verification);

    } catch (error) {
      console.error('Verify shortcut error:', error);
      res.status(500).json({
        error: 'Failed to verify shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Shortcut sharing routes

  // Create shareable shortcut
  app.post('/api/shortcuts/share', async (req, res) => {
    try {
      const {
        shortcut,
        signFile = false,
        isPublic = true,
        description,
        tags = [],
        author = 'Anonymous'
      }: {
        shortcut: Shortcut;
        signFile?: boolean;
        isPublic?: boolean;
        description?: string;
        tags?: string[];
        author?: string;
      } = req.body;

      if (!shortcut || !shortcut.name || !Array.isArray(shortcut.actions)) {
        return res.status(400).json({ error: 'Invalid shortcut data' });
      }

      // Build shortcut file
      const shortcutBuffer = convertToPlist(shortcut);
      let signedBuffer: Buffer | undefined;

      // Sign if requested and available
      if (signFile) {
        const capability = await checkSigningCapability();
        if (capability.available) {
          const tempPath = `/tmp/share_${Date.now()}.shortcut`;
          const fs = await import('fs/promises');
          await fs.writeFile(tempPath, shortcutBuffer);

          const signingResult = await signShortcut(tempPath);
          if (signingResult.success && signingResult.signedFilePath) {
            signedBuffer = await fs.readFile(signingResult.signedFilePath);
          }
        }
      }

      // Create shared shortcut
      const shared = await createSharedShortcut(
        shortcut,
        shortcutBuffer,
        signedBuffer,
        { isPublic, description, tags, author }
      );

      res.json(generateSharingMetadata(shared));

    } catch (error) {
      console.error('Share shortcut error:', error);
      res.status(500).json({
        error: 'Failed to share shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get shared shortcut info
  app.get('/api/shortcuts/share/:id', async (req, res) => {
    try {
      const shared = await getSharedShortcut(req.params.id);
      if (!shared) {
        return res.status(404).json({ error: 'Shared shortcut not found' });
      }

      res.json(generateSharingMetadata(shared));
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get shared shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Download shared shortcut
  app.get('/api/shortcuts/download/:id', async (req, res) => {
    try {
      const { signed = 'false' } = req.query;
      const shared = await getSharedShortcut(req.params.id);

      if (!shared) {
        return res.status(404).json({ error: 'Shared shortcut not found' });
      }

      const wantSigned = signed === 'true';
      const buffer = await getShortcutFile(req.params.id, wantSigned);

      if (!buffer) {
        return res.status(404).json({ error: 'Shortcut file not found' });
      }

      // Increment download count
      await incrementDownloadCount(req.params.id);

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${shared.name.replace(/[^a-zA-Z0-9]/g, '_')}${wantSigned ? '_signed' : ''}.shortcut"`,
        'X-Shortcut-ID': shared.id,
        'X-Download-Count': (shared.downloadCount + 1).toString(),
        'X-Is-Signed': wantSigned.toString()
      });

      res.send(buffer);

    } catch (error) {
      console.error('Download shortcut error:', error);
      res.status(500).json({
        error: 'Failed to download shortcut',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get QR code for shared shortcut
  app.get('/api/qr/:id', async (req, res) => {
    try {
      const qrBuffer = await getQRCode(req.params.id);
      if (!qrBuffer) {
        return res.status(404).json({ error: 'QR code not found' });
      }

      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(qrBuffer);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get QR code',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // List public shortcuts
  app.get('/api/shortcuts/public', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await listPublicShortcuts(limit, offset);

      res.json({
        shortcuts: result.shortcuts.map(generateSharingMetadata),
        total: result.total,
        limit,
        offset
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list public shortcuts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Search shortcuts
  app.get('/api/shortcuts/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const results = await searchShortcuts(query, tags, limit);

      res.json({
        shortcuts: results.map(generateSharingMetadata),
        query,
        tags,
        count: results.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to search shortcuts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get sharing statistics
  app.get('/api/shortcuts/stats', async (req, res) => {
    try {
      const stats = await getSharingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get sharing stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Web interface for shared shortcuts
  app.get('/share/:id', async (req, res) => {
    try {
      const shared = await getSharedShortcut(req.params.id);
      if (!shared) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Shortcut Not Found - ShortcutGenius</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center;">
            <h1>Shortcut Not Found</h1>
            <p>The shortcut you're looking for doesn't exist or has been removed.</p>
            <a href="/" style="color: #007AFF;">← Back to ShortcutGenius</a>
          </body>
          </html>
        `);
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${shared.name} - ShortcutGenius</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="${shared.description}">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
              background: #f5f5f7;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { text-align: center; margin-bottom: 30px; }
            .title { color: #1d1d1f; margin: 0 0 10px; }
            .description { color: #86868b; margin: 0; }
            .actions { margin: 20px 0; }
            .action-item {
              background: #f6f6f6;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
              border-left: 4px solid #007AFF;
            }
            .download-section { text-align: center; margin-top: 30px; }
            .btn {
              background: #007AFF;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              text-decoration: none;
              display: inline-block;
              margin: 5px;
              font-weight: 600;
            }
            .btn:hover { background: #0056d3; }
            .btn.secondary { background: #34c759; }
            .btn.secondary:hover { background: #2db14e; }
            .meta {
              color: #86868b;
              font-size: 14px;
              text-align: center;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e7;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${shared.name}</h1>
              <p class="description">${shared.description}</p>
            </div>

            <div class="actions">
              <h3>Actions (${shared.originalShortcut.actions.length})</h3>
              ${shared.originalShortcut.actions.slice(0, 5).map((action, i) => `
                <div class="action-item">
                  <strong>${i + 1}. ${action.type}</strong>
                  ${Object.keys(action.parameters).length > 0 ?
                    '<br><small>' + Object.entries(action.parameters).slice(0, 2).map(([k,v]) => `${k}: ${v}`).join(', ') + '</small>'
                    : ''}
                </div>
              `).join('')}
              ${shared.originalShortcut.actions.length > 5 ? `<p><em>... and ${shared.originalShortcut.actions.length - 5} more actions</em></p>` : ''}
            </div>

            <div class="download-section">
              <a href="${baseUrl}/api/shortcuts/download/${shared.id}" class="btn">
                📱 Download Shortcut
              </a>
              ${shared.signedFilePath ? `
                <a href="${baseUrl}/api/shortcuts/download/${shared.id}?signed=true" class="btn secondary">
                  ✅ Download Signed
                </a>
              ` : ''}
              <br><br>
              <img src="${baseUrl}/api/qr/${shared.id}" alt="QR Code" style="max-width: 200px; border-radius: 8px;">
              <p><small>Scan with your iPhone to open directly in Shortcuts app</small></p>
            </div>

            <div class="meta">
              By ${shared.author} • ${shared.downloadCount} downloads • ${new Date(shared.createdAt).toLocaleDateString()}
              <br>
              ${shared.tags.length > 0 ? `Tags: ${shared.tags.join(', ')}` : ''}
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="/" style="color: #007AFF;">← Create your own shortcuts with ShortcutGenius</a>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Share page error:', error);
      res.status(500).send('Error loading shared shortcut');
    }
  });

  // OpenRouter models API endpoints
  app.get('/api/models/openrouter', async (req, res) => {
    try {
      const models = await openRouterModelsService.fetchAvailableModels();
      const categorized = openRouterModelsService.categorizeModels(models);

      res.json({
        models,
        categorized,
        total: models.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      res.status(500).json({
        error: 'Failed to fetch OpenRouter models',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Search OpenRouter models
  app.get('/api/models/openrouter/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const models = await openRouterModelsService.searchModels(query);

      res.json({
        models,
        query,
        total: models.length
      });
    } catch (error) {
      console.error('Failed to search OpenRouter models:', error);
      res.status(500).json({
        error: 'Failed to search OpenRouter models',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific OpenRouter model details
  app.get('/api/models/openrouter/:modelId(*)', async (req, res) => {
    try {
      const modelId = req.params.modelId;
      const model = await openRouterModelsService.getModelById(modelId);

      if (!model) {
        return res.status(404).json({
          error: 'Model not found',
          modelId
        });
      }

      res.json(model);
    } catch (error) {
      console.error('Failed to get OpenRouter model:', error);
      res.status(500).json({
        error: 'Failed to get OpenRouter model',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Web search API endpoint for testing
  app.post('/api/search', async (req, res) => {
    try {
      const { query, max_results = 5, search_type = 'basic' } = req.body;

      if (!query) {
        return res.status(400).json({
          error: 'Query parameter is required'
        });
      }

      let results;
      if (search_type === 'api_docs') {
        results = await webSearchTool.searchForAPIDocumentation(query, max_results);
      } else {
        results = await webSearchTool.search(query, max_results);
      }

      res.json(results);
    } catch (error) {
      console.error('Web search error:', error);
      res.status(500).json({
        error: 'Web search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test extract functionality
  app.post('/api/test/extract', async (req, res) => {
    try {
      const { urls, prompt } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          error: 'URLs array is required'
        });
      }

      const results = await webSearchTool.extract(urls, prompt);
      res.json(results);
    } catch (error) {
      console.error('Extract error:', error);
      res.status(500).json({
        error: 'Extract failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test crawl functionality
  app.post('/api/test/crawl', async (req, res) => {
    try {
      const { url, limit = 10, prompt } = req.body;

      if (!url) {
        return res.status(400).json({
          error: 'URL parameter is required'
        });
      }

      const results = await webSearchTool.crawl(url, limit, prompt);
      res.json(results);
    } catch (error) {
      console.error('Crawl error:', error);
      res.status(500).json({
        error: 'Crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test API documentation extraction
  app.post('/api/test/api-docs', async (req, res) => {
    try {
      const { serviceName, searchQuery } = req.body;

      if (!serviceName) {
        return res.status(400).json({
          error: 'Service name is required'
        });
      }

      const { APIDocumentationExtractor } = await import('./api-documentation-extractor');
      const extractor = new APIDocumentationExtractor(webSearchTool);

      const apiDocs = await extractor.extractAPIDocumentation(serviceName, searchQuery);
      res.json(apiDocs);
    } catch (error) {
      console.error('API docs extraction error:', error);
      res.status(500).json({
        error: 'API documentation extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Conversational AI Chat API
  app.post('/api/chat', async (req, res) => {
    try {
      const { model, message, conversationHistory = [], userId = 'anonymous', reasoningOptions } = req.body;

      if (!model || !message) {
        return res.status(400).json({
          error: 'Model and message are required'
        });
      }

      // Build conversation context
      const contextPrompt = `
You are an expert iOS Shortcuts developer with real-time web search capabilities. You help users build iOS shortcuts by:

1. **Searching for APIs** - Always search for current API documentation when users mention services
2. **Building real integrations** - Use actual APIs, never placeholders
3. **Iterative development** - Work with users step by step to build shortcuts
4. **Showing your work** - Always show searches, findings, and reasoning

**Your responses should:**
- Be conversational and helpful
- Use web search extensively for API discovery
- Show your search results and reasoning
- Ask clarifying questions when needed
- Build shortcuts iteratively with user input
- Update shortcuts based on feedback

**Current conversation context:**
${conversationHistory.map((msg: any) => `${msg.type}: ${msg.content}`).join('\n')}

**User's latest message:**
${message}

Please respond conversationally and search for any APIs or services mentioned.
      `;

      // Process the request with search activity tracking
      const response = await aiProcessor.process({
        model,
        prompt: contextPrompt,
        type: 'generate',
        systemPrompt: SYSTEM_PROMPT,
        reasoningOptions
      });

      // Extract any shortcut that might have been generated
      let shortcutUpdate = null;
      try {
        // Try to parse any JSON shortcut from the response
        const jsonMatch = response.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          shortcutUpdate = JSON.parse(jsonMatch[1]);
        }
      } catch (parseError) {
        // Ignore parsing errors - not all responses will contain shortcuts
      }

      res.json({
        response: response.content,
        searchActivity: response.searchActivity || [],
        generatedWithWebSearch: response.generatedWithWebSearch || false,
        shortcutUpdate,
        usage: response.usage
      });

    } catch (error: any) {
      console.error('Chat API error:', error);
      res.status(500).json({
        error: 'Chat processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        searchActivity: [],
        generatedWithWebSearch: false
      });
    }
  });

  // Test all Tavily capabilities
  app.post('/api/test/tavily-comprehensive', async (req, res) => {
    try {
      const { serviceName = 'OpenWeatherMap' } = req.body;

      console.log(`🧪 Testing comprehensive Tavily capabilities for ${serviceName}`);

      // Test 1: Basic search
      console.log('1️⃣ Testing basic search...');
      const searchResults = await webSearchTool.search(`${serviceName} API`);

      // Test 2: API documentation search
      console.log('2️⃣ Testing API documentation search...');
      const apiSearchResults = await webSearchTool.searchForAPIDocumentation(`${serviceName} API documentation`);

      // Test 3: Extract from documentation URLs
      let extractResults = null;
      if (apiSearchResults.results.length > 0) {
        console.log('3️⃣ Testing extract from documentation...');
        const docUrls = apiSearchResults.results.slice(0, 2).map(r => r.url);
        extractResults = await webSearchTool.extract(
          docUrls,
          `Extract detailed API information for ${serviceName}`
        );
      }

      // Test 4: Crawl main documentation site
      let crawlResults = null;
      if (apiSearchResults.results.length > 0) {
        console.log('4️⃣ Testing crawl functionality...');
        const mainUrl = apiSearchResults.results[0].url;
        try {
          crawlResults = await webSearchTool.crawl(
            mainUrl,
            3,
            `Comprehensive API documentation extraction for ${serviceName}`
          );
        } catch (crawlError) {
          console.warn('Crawl test failed:', crawlError);
        }
      }

      // Test 5: Full API documentation extraction
      console.log('5️⃣ Testing full API documentation extraction...');
      const { APIDocumentationExtractor } = await import('./api-documentation-extractor');
      const extractor = new APIDocumentationExtractor(webSearchTool);
      const apiDocs = await extractor.extractAPIDocumentation(serviceName);

      const testResults = {
        serviceName,
        timestamp: new Date().toISOString(),
        tests: {
          basicSearch: {
            success: searchResults.results.length > 0,
            resultCount: searchResults.results.length,
            hasAnswer: !!(searchResults as any).answer
          },
          apiDocumentationSearch: {
            success: apiSearchResults.results.length > 0,
            resultCount: apiSearchResults.results.length,
            sampleUrls: apiSearchResults.results.slice(0, 3).map(r => r.url)
          },
          extract: {
            success: extractResults ? extractResults.results.length > 0 : false,
            resultCount: extractResults ? extractResults.results.length : 0,
            tested: !!extractResults
          },
          crawl: {
            success: crawlResults ? crawlResults.results.length > 0 : false,
            resultCount: crawlResults ? crawlResults.results.length : 0,
            tested: !!crawlResults
          },
          fullApiExtraction: {
            success: !!(apiDocs.endpoints.length > 0),
            endpointCount: apiDocs.endpoints.length,
            hasAuthentication: apiDocs.authentication.type !== 'none',
            exampleCount: apiDocs.examples.length,
            sourceUrlCount: apiDocs.sourceUrls.length
          }
        },
        summary: {
          totalTestsRun: Object.keys(apiDocs).length,
          allSuccessful: (
            searchResults.results.length > 0 &&
            apiSearchResults.results.length > 0 &&
            apiDocs.endpoints.length > 0
          )
        },
        tavilyConfig: {
          searchEngine: (webSearchTool as any).searchEngine,
          hasApiKey: !!(webSearchTool as any).apiKey
        }
      };

      res.json(testResults);
    } catch (error) {
      console.error('Comprehensive test error:', error);
      res.status(500).json({
        error: 'Comprehensive test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}


//hello