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
import { AgenticShortcutBuilder } from './agentic-shortcut-builder';
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
import { registerConversationRoutes } from './routes/conversations';
import { registerSimpleConversationRoutes } from './routes/simple-conversations';
import {
  disconnectProvider,
  loadProviders,
  setProviderKey,
  getProvidersStatus,
  startCodexOAuth,
  exchangeCodexToken,
  PROVIDER_URLS,
  type ProviderName,
} from './providers';
import { getAiActionPromptPath, getBaseUrl } from './runtime-config';
import { ConversationalShortcutAgent } from './conversational-agent';
import { db } from '../db';
import { conversations } from '../db/schema';

// AI Model Clients - Direct APIs and OpenRouter (initialized after dotenv config)
let openai: OpenAI;
let anthropic: Anthropic;
let openrouter: OpenRouterClient;
let openRouterModelsService: OpenRouterModelsService;
let webSearchTool: WebSearchTool;

// Initialize function to be called after dotenv config
async function initializeServices() {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '', timeout: 60000 });
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '', timeout: 60000 });
  openrouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY || '');

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

    // Initialize conversational agent
    conversationalAgent = new ConversationalShortcutAgent(aiProcessor, webSearchTool);
    console.log('✅ Conversational agent initialized');

    // Load action prompt for agentic builder
    const fs = await import('fs/promises');
    const actionPrompt = await fs.readFile(getAiActionPromptPath(), 'utf8');

    // Initialize agentic builder
    agenticBuilder = new AgenticShortcutBuilder(
      openrouter,
      webSearchTool,
      actionPrompt
    );
    console.log('✅ Agentic shortcut builder initialized');
  } catch (error) {
    console.error('Failed to initialize AI processor:', error);
  }
}

// Global variables for initialization
let aiProcessor: AIProcessor;
let agenticBuilder: AgenticShortcutBuilder;
let conversationalAgent: ConversationalShortcutAgent;
let SUPPORTED_MODELS: string[] = [];

// Initialize services - will be called from registerRoutes
// Don't auto-initialize here to avoid timing issues
let servicesInitialized = false;

function extractShortcutJson(payload: string): any | null {
  try {
    return JSON.parse(payload);
  } catch {}

  const start = payload.indexOf('{');
  const end = payload.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(payload.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function canUseConversationStore(): Promise<boolean> {
  try {
    const storageMode = (process.env.CONVERSATION_STORE_MODE || '').toLowerCase();
    if (storageMode === 'memory' || storageMode === 'none' || process.env.NO_STORAGE_MODE === 'true') {
      console.log('🧪 Conversation store forced to memory mode via environment');
      return false;
    }

    if (!db?.$client?.query) {
      return false;
    }

    const result = await db.$client.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conversations'",
      []
    );

    if (!result?.rows || result.rows.length === 0) {
      return false;
    }

    await db.select({ id: conversations.id }).from(conversations).limit(1);
    return true;
  } catch (error) {
    console.warn('⚠️ Conversation store not available:', error);
    return false;
  }
}

const SYSTEM_PROMPT = `The assistant is in a highly skilled iOS Shortcuts architect kind of mood. The assistant specializes in reverse engineering and optimizing shortcuts with precision and expertise.

The assistant has access to comprehensive web search and content extraction tools to find current information, latest iOS features, new shortcut actions, or any other up-to-date information relevant to creating or analyzing shortcuts. The assistant uses these capabilities when recent information is needed or when users ask about current events, latest versions, or anything that might have changed recently.

**Available Web Tools:**
1. **web_search** - Search the web for current information, API documentation, news, or specific topics. Use search_type="api_docs" for comprehensive API documentation searches.
2. **web_extract** - Extract detailed content from specific URLs, perfect for getting complete API documentation, specifications, or detailed information from known sources.
3. **web_crawl** - Crawl entire websites or documentation sections to get comprehensive information about APIs, services, or topics. Use this when you need to explore multiple pages from the same site.

**When to Use Each Tool:**
- Use **web_search** when you need to find information about a topic, service, or API but don't have specific URLs
- Use **web_extract** when you have specific documentation URLs and need detailed content extraction
- Use **web_crawl** when you need comprehensive information from an entire documentation site or multiple related pages

**Best Practices for API Documentation:**
- For API integration tasks, prefer web_search with search_type="api_docs" first
- If you find good documentation URLs, use web_extract to get detailed information
- For comprehensive API understanding, use web_crawl on the main documentation site
- Always extract endpoints, parameters, authentication methods, and code examples

CRITICAL iOS ACTION IDENTIFIERS — use these EXACT types in JSON:
| Intent                        | Correct type                                      | Notes                                  |
|-------------------------------|---------------------------------------------------|----------------------------------------|
| Set a URL value               | url                                               | params: { url: "https://..." }         |
| Fetch URL / HTTP request      | getcontentsofurl (NOT downloadurl)                | Takes implicit input from url action   |
| Show result text              | showresult                                        | params: { text: "..." }                |
| Quick Look preview            | quicklook                                         | Takes implicit input from prior action |
| Show a notification           | notification                                      | params: { title, body }                |
| Ask for input                 | ask                                               | params: { prompt }                     |
| Text / string value           | text                                              | params: { text: "..." }                |
| Speak text aloud              | speak                                             | Takes implicit input                   |
| Get clipboard                 | get_clipboard                                     | No params needed                       |
| Set clipboard                 | set_clipboard                                     | Takes implicit input                   |
| Open URL in Safari            | open_url                                          | Takes implicit input or URL param      |

CANONICAL DATA FLOW PATTERNS:
1. Fetch URL and preview:
   [url → getcontentsofurl → quicklook]
2. Fetch and show text:
   [url → getcontentsofurl → showresult]
3. Ask and notify:
   [ask → notification]
4. Take photo and save:
   [take_photo → save_file]
5. Speak text:
   [text → speak]

NEVER use "downloadurl" or "previewdocument" — they are deprecated and will fail.
ALWAYS use real URLs, never placeholders like "example.com" or "your-url-here".

ERROR RECOVERY: If the user reports that a shortcut didn't work or pastes an error message,
immediately offer to fix it. Ask which step failed and what error appeared, then regenerate
a corrected shortcut addressing the specific failure.

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

export async function registerRoutes(app: Express) {
  // Ensure services are initialized before registering routes
  if (!servicesInitialized) {
    await initializeServices();
    servicesInitialized = true;
  }

  // Register conversation routes
  try {
    console.log('🗨️ Registering conversation routes...');

    // Use real AI-powered routes with conversational agent
    const canUseDb = await canUseConversationStore();

    if (conversationalAgent && canUseDb) {
      registerConversationRoutes(app, conversationalAgent);
      console.log('✅ Full conversation routes with AI agent registered');
    } else {
      console.warn('⚠️ Using simplified conversation routes (AI or database unavailable)');
      registerSimpleConversationRoutes(app, conversationalAgent);
      console.log('✅ Simplified conversation routes registered');
    }

  } catch (error) {
    console.warn('⚠️ Failed to register conversation routes:', error);
    console.log('✅ Server running with basic functionality available');
  }

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
    if (!aiProcessor || !openrouter) {
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

    const keyStatus = aiProcessor.checkApiKeyAvailability(model);
    if (!keyStatus.available) {
      return res.status(400).json({
        error: keyStatus.error || 'Model API key not configured'
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

      // Use the new AI processor for both analysis and generation
      if (type === 'analyze') {
        try {
          // Parse input shortcut for local analysis when possible
          const inputShortcut = extractShortcutJson(prompt);

          // Run AI analysis and local analysis in parallel
          const [aiProcessorResult, localAnalysis] = await Promise.all([
            aiProcessor.process({
              model,
              prompt,
              type,
              systemPrompt: SYSTEM_PROMPT,
              reasoningOptions
            }),
            inputShortcut ? analyzeShortcut(inputShortcut) : Promise.resolve(undefined)
          ]);

          // Validate AI analysis response
          const validation = validateAndParseJSON(aiProcessorResult.content, type);
          if (!validation.valid) {
            throw new Error(`Invalid analysis generated: ${validation.error}`);
          }

          result = {
            content: JSON.stringify(validation.data),
            localAnalysis,
            usage: aiProcessorResult.usage
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
              error: `Invalid shortcut generated: ${validation.error}`
            });
          }

          result = {
            content: JSON.stringify(validation.data),
            usage: aiProcessorResult.usage
          };

        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error';
          return res.status(500).json({
            error: `AI Processing Error: ${errorMessage}`
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

  // Agentic mode endpoint - builds shortcuts using multi-turn agent loop
  app.post('/api/agentic/generate', async (req, res) => {
    const { prompt, model = 'anthropic/claude-3.5-sonnet', maxIterations = 15 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Missing required field: prompt'
      });
    }

    if (!agenticBuilder) {
      return res.status(503).json({
        error: 'Agentic builder not initialized'
      });
    }

    try {
      console.log(`🤖 Starting agentic generation with model: ${model}`);

      const result = await agenticBuilder.buildShortcut(prompt, model, maxIterations);

      res.json({
        shortcut: result.shortcut,
        metadata: {
          mode: 'agentic',
          iterations: result.metadata.iterations,
          searchesPerformed: result.metadata.searchesPerformed,
          confidence: result.metadata.confidence,
          summary: result.metadata.summary
        }
      });

    } catch (error) {
      console.error('Agentic generation error:', error);
      res.status(500).json({
        error: `Agentic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      const {
        shortcut,
        format = 'plist',
        sign = true,
        signMode = 'anyone',
        debug = false
      }: { shortcut: Shortcut; format?: 'plist' | 'binary'; sign?: boolean; signMode?: 'anyone' | 'contacts-only'; debug?: boolean } = req.body;

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
      const buffer = format === 'binary' ? convertToBinaryPlist(shortcut, { debug }) : convertToPlist(shortcut, { debug });
      let outputBuffer = buffer;
      let isSigned = false;

      if (sign) {
        const capability = await checkSigningCapability();
        if (!capability.available) {
          return res.status(400).json({
            error: 'Signing not available',
            details: capability.reason
          });
        }

        const tempDir = '/tmp/shortcut-signing';
        const fs = await import('fs/promises');
        await fs.mkdir(tempDir, { recursive: true });

        const inputPath = `${tempDir}/${Date.now()}_build.shortcut`;
        await fs.writeFile(inputPath, buffer);

        const signingResult = await signShortcut(inputPath, { mode: signMode, outputDir: tempDir });
        if (!signingResult.success || !signingResult.signedFilePath) {
          return res.status(400).json({
            error: 'Signing failed',
            details: signingResult.error || 'Unknown signing error'
          });
        }

        outputBuffer = await fs.readFile(signingResult.signedFilePath);
        isSigned = true;
      }

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${shortcut.name.replace(/[^a-zA-Z0-9]/g, '_')}${isSigned ? '_signed' : ''}.shortcut"`,
        'X-Shortcut-ID': metadata.id,
        'X-Shortcut-Hash': metadata.hash,
        'X-Action-Count': metadata.actionCount.toString(),
        'X-Is-Signed': isSigned.toString()
      });

      res.send(outputBuffer);

    } catch (error) {
      console.error('Build shortcut error:', error);
      res.status(500).json({
        error: 'Failed to build shortcut',
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
        signFile = true,
        isPublic = true,
        description,
        tags = [],
        author = 'Anonymous',
        icloudUrl
      }: {
        shortcut: Shortcut;
        signFile?: boolean;
        isPublic?: boolean;
        description?: string;
        tags?: string[];
        author?: string;
        icloudUrl?: string;
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
        if (!capability.available) {
          return res.status(400).json({
            error: 'Signing not available',
            details: capability.reason
          });
        }

        const tempPath = `/tmp/share_${Date.now()}.shortcut`;
        const fs = await import('fs/promises');
        await fs.writeFile(tempPath, shortcutBuffer);

        const signingResult = await signShortcut(tempPath);
        if (!signingResult.success || !signingResult.signedFilePath) {
          return res.status(400).json({
            error: 'Signing failed',
            details: signingResult.error || 'Unknown signing error'
          });
        }

        signedBuffer = await fs.readFile(signingResult.signedFilePath);
      }

      const sanitizedIcloudUrl = typeof icloudUrl === 'string' && icloudUrl.trim().length > 0
        ? icloudUrl.trim()
        : undefined;

      // Create shared shortcut
      const baseUrl = getBaseUrl();
      const shared = await createSharedShortcut(
        shortcut,
        shortcutBuffer,
        signedBuffer,
        { isPublic, description, tags, author, icloudUrl: sanitizedIcloudUrl, baseUrl }
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
      const { signed = 'true' } = req.query;
      const shared = await getSharedShortcut(req.params.id);

      if (!shared) {
        return res.status(404).json({ error: 'Shared shortcut not found' });
      }

      const wantSigned = signed !== 'false';
      if (wantSigned && !shared.signedFilePath) {
        return res.status(409).json({
          error: 'Signed shortcut unavailable',
          details: 'This shared shortcut does not include a signed file.'
        });
      }
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

      const baseUrl = getBaseUrl();

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
              ${shared.icloudUrl ? `
                <a href="${shared.icloudUrl}" class="btn secondary">
                  ☁️ Open iCloud Link
                </a>
              ` : ''}
              ${shared.signedFilePath ? `
                <a href="${baseUrl}/api/shortcuts/download/${shared.id}?signed=true" class="btn secondary">
                  ✅ Download Signed Shortcut
                </a>
                <a href="${baseUrl}/api/shortcuts/download/${shared.id}?signed=false" class="btn">
                  📦 Download Unsigned (Advanced)
                </a>
              ` : `
                <p><strong>Signed file unavailable.</strong> This shortcut must be re-shared with signing enabled.</p>
              `}
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
  app.get('/api/models/availability', (req, res) => {
    const openaiKey = Boolean(process.env.OPENAI_API_KEY);
    const openrouterKey = Boolean(process.env.OPENROUTER_API_KEY);
    const anthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

    const openaiAvailable = openaiKey || openrouterKey;
    const anthropicAvailable = anthropicKey;
    const openrouterAvailable = openrouterKey;

    const suggestedDefault = openaiAvailable
      ? 'gpt-4o'
      : anthropicAvailable
        ? 'claude-3-5-sonnet-20241022'
        : openrouterAvailable
          ? 'minimax/minimax-m2.1'
          : 'gpt-4o';

    res.json({
      openai: {
        available: openaiAvailable,
        direct: openaiKey,
        viaOpenRouter: !openaiKey && openrouterKey
      },
      anthropic: {
        available: anthropicAvailable
      },
      openrouter: {
        available: openrouterAvailable
      },
      suggestedDefault
    });
  });

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

  // Direct OpenRouter test endpoint
  app.post('/api/openrouter/test', async (req, res) => {
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(400).json({
          error: 'OpenRouter API key not configured'
        });
      }

      const { model = 'openai/gpt-4o-mini', prompt, system, temperature } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          error: 'Prompt is required'
        });
      }

      const messages = [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt }
      ];

      const response = await openrouter.createChatCompletion({
        model,
        messages: messages as any,
        temperature: typeof temperature === 'number' ? temperature : 0.7
      });

      const content = response.choices?.[0]?.message?.content || '';
      res.json({
        model: response.model,
        content,
        usage: response.usage
      });
    } catch (error: any) {
      console.error('OpenRouter test error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'OpenRouter test failed'
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

  // --- Provider management routes ---

  // GET /api/providers — return connection status for all providers
  app.get('/api/providers', async (_req, res) => {
    try {
      const status = await getProvidersStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/providers/:name — save API key
  app.post('/api/providers/:name', async (req, res) => {
    try {
      const name = req.params.name as ProviderName;
      const { apiKey } = req.body;
      if (!apiKey?.trim()) return res.status(400).json({ error: 'apiKey required' });
      await setProviderKey(name, apiKey.trim());
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // DELETE /api/providers/:name — disconnect / remove key
  app.delete('/api/providers/:name', async (req, res) => {
    try {
      const name = req.params.name as ProviderName;
      await disconnectProvider(name);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // POST /api/providers/:name/test — test connection with a simple chat completions call
  app.post('/api/providers/:name/test', async (req, res) => {
    try {
      const name = req.params.name as ProviderName;
      const store = await loadProviders();
      const provider = store[name];

      if (!provider.connected || (!provider.apiKey && !provider.oauthToken)) {
        return res.json({ ok: false, error: 'Provider not configured' });
      }

      const baseURL = PROVIDER_URLS[name];
      const token = provider.apiKey || provider.oauthToken || '';

      // Use the provider's own default model for the test
      const modelMap: Record<ProviderName, string> = {
        glm: 'glm-4.7',
        kimi: 'kimi-k2-0711-preview',
        minimax: 'MiniMax-M2.1',
        opencode: 'opencode-go/default',
        codex: 'codex-1',
      };

      const testClient = new OpenAI({ apiKey: token, baseURL, timeout: 15000 });
      await testClient.chat.completions.create({
        model: modelMap[name] || 'default',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      });

      res.json({ ok: true });
    } catch (err: any) {
      res.json({ ok: false, error: err?.message || String(err) });
    }
  });

  // GET /api/providers/oauth/codex/start — begin Codex PKCE OAuth flow
  app.get('/api/providers/oauth/codex/start', (_req, res) => {
    const { url } = startCodexOAuth();
    res.json({ url });
  });

  // GET /api/providers/oauth/codex/callback — receive OAuth code from browser redirect
  app.get('/api/providers/oauth/codex/callback', async (req, res) => {
    const { code, error } = req.query as Record<string, string>;
    if (error) {
      return res.send(`<html><body><p>OAuth error: ${error}</p><script>window.close()</script></body></html>`);
    }
    if (!code) {
      return res.send('<html><body><p>Missing code</p><script>window.close()</script></body></html>');
    }
    const result = await exchangeCodexToken(code);
    if (result.success) {
      res.send('<html><body><p>Codex connected! You can close this window.</p><script>window.close()</script></body></html>');
    } else {
      res.send(`<html><body><p>Error: ${result.error}</p><script>window.close()</script></body></html>`);
    }
  });
}


//hello
