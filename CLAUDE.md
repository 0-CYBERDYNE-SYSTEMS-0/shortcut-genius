# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShortcutGenius is a web application for creating, analyzing, and optimizing iOS Shortcuts using AI. It features a React frontend with Monaco editor, a Node.js/Express backend, and integrates with multiple AI providers (OpenAI, Anthropic, OpenRouter) plus web search capabilities.

## Development Commands

```bash
# Start development server (runs on port 4321 by default, or PORT env var)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Update database schema
npm run db:push
```

## Environment Variables

Required API keys:
- `OPENAI_API_KEY` - For GPT-4o model access
- `ANTHROPIC_API_KEY` - For Claude 3.5 Sonnet access
- `OPENROUTER_API_KEY` - For OpenRouter model access
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` (optional) - Server port, defaults to 4321

Optional search capabilities:
- `TAVILY_API_KEY` or `SERPER_API_KEY` or `BRAVE_API_KEY` - For web search functionality
- `SEARCH_ENGINE` - Choose: 'tavily', 'serper', 'brave', or 'duckduckgo' (default: duckduckgo)

## Architecture

### Frontend (client/)
- **React + TypeScript** application with Vite
- **UI Components**: Built with Radix UI primitives and styled with Tailwind CSS
- **Monaco Editor**: Custom syntax highlighting for iOS Shortcut JSON
- **Key Components**:
  - `EditorPane`: Monaco editor for JSON shortcut editing
  - `PreviewPane`: Visual preview of shortcut actions
  - `AnalysisPane`: Displays AI-powered analysis results
  - `Toolbar`: Model selection and import/export functionality
  - `ModelSelector`: Dynamic model selection including OpenRouter models
  - `ShareDialog`: Shortcut sharing with QR codes

### Backend (server/)
- **Express server** serving both API and static files
- **Multi-Provider AI Integration**:
  - Direct APIs: OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet
  - OpenRouter: Access to 100+ AI models
  - Intelligent model routing based on task complexity
  - Circuit breaker pattern for API resilience
  - Response caching for performance
- **Web Search Integration**:
  - Tavily, Serper, Brave, or DuckDuckGo for real-time information
  - API documentation extraction
  - Web crawling capabilities
- **Shortcut Building System**:
  - Convert JSON shortcuts to Apple .shortcut format (plist/binary)
  - Apple compatibility validation
  - Shortcut signing capabilities (macOS only)
  - Metadata generation
- **Sharing System**:
  - Create shareable shortcuts with unique IDs
  - QR code generation for mobile access
  - Public gallery and search functionality
  - Download tracking

### Key Backend Services

#### AI Processor (server/ai-processor.ts)
- Unified interface for all AI providers
- Action database integration with 25+ shortcut actions
- Prompt enhancement with action suggestions
- Reasoning token support for compatible models
- Web search tool integration

#### Model Router (server/model-router.ts)
- Intelligent model selection based on:
  - Task complexity (word count, keywords, JSON structure)
  - Performance history (response time, success rate)
  - Model capabilities (speed, accuracy, token limits)
- Performance tracking and optimization
- Automatic fallback on model failure

#### Circuit Breaker (server/circuit-breaker.ts)
- Protects against API failures
- States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- Automatic recovery testing
- Per-provider tracking

#### Shortcut Builder (server/shortcut-builder.ts)
- Converts JSON to Apple plist format (XML or binary)
- Validates Apple Shortcuts compatibility
- Generates shortcut metadata (ID, hash, action count)

#### Shortcut Signer (server/shortcut-signer.ts)
- Signs shortcuts using macOS security tools (macOS only)
- Verification of signed shortcuts
- Mock signing for development/testing

#### Shortcut Sharing (server/shortcut-sharing.ts)
- File-based sharing system (shares/ directory)
- Public gallery with search and tags
- QR code generation for mobile downloads
- Download statistics tracking

### Shortcut System (client/src/lib/)

#### shortcuts.ts
- Core shortcut types and validation
- 25+ supported action types with parameter schemas
- Permission tracking (media, location, health, home, etc.)
- Circular reference detection in nested actions
- Parameter sanitization and validation
- Test case templates for common patterns

#### shortcut-analyzer.ts
- Local analysis engine for patterns and optimization
- Dependency mapping between actions
- Security vulnerability detection (CWE references)
- Performance optimization suggestions
- Permission analysis with alternatives

#### models.ts
- Model configuration and capabilities
- OpenRouter model support
- Reasoning token configuration
- Verbosity controls
- Provider-specific settings

## API Endpoints

### AI Processing
- `POST /api/process` - Generate or analyze shortcuts with AI
  - Parameters: `model`, `prompt`, `type` (generate/analyze), `reasoningOptions`
  - Returns: AI-generated content + local analysis (for analyze)
  - Headers: Model selection details (X-Model-Selected, X-Model-Confidence, etc.)

### Shortcut Building & Signing
- `POST /api/shortcuts/build` - Convert JSON to .shortcut file
- `GET /api/shortcuts/signing-info` - Check signing capabilities
- `POST /api/shortcuts/sign` - Sign a shortcut file (macOS only)
- `POST /api/shortcuts/verify` - Verify shortcut signature

### Sharing System
- `POST /api/shortcuts/share` - Create shareable shortcut
- `GET /api/shortcuts/share/:id` - Get shortcut metadata
- `GET /api/shortcuts/download/:id` - Download shortcut file
- `GET /api/qr/:id` - Get QR code image
- `GET /api/shortcuts/public` - List public shortcuts (paginated)
- `GET /api/shortcuts/search` - Search shortcuts by query/tags
- `GET /api/shortcuts/stats` - Sharing statistics
- `GET /share/:id` - Web interface for shared shortcut

### Model & Search APIs
- `GET /api/models/openrouter` - List available OpenRouter models
- `GET /api/models/openrouter/search` - Search models by name/capabilities
- `GET /api/models/openrouter/:modelId` - Get specific model details
- `POST /api/search` - Web search endpoint (for testing)
- `POST /api/test/extract` - Extract content from URLs
- `POST /api/test/crawl` - Crawl website for information

### System Monitoring
- `GET /api/health` - Health check with circuit breaker status
- `GET /api/stats` - Performance metrics (models, cache, circuit breakers)
- `POST /api/reinit` - Force reinitialize services

## Key Implementation Details

### AI Integration
1. **System Prompts**: Defined in `server/routes.ts:106-161`
   - Includes web search capabilities documentation
   - Lists all available shortcut actions with parameters
   - Provides analysis response format specification

2. **Response Handling**:
   - Cleans markdown code blocks from AI responses
   - Validates JSON structure based on request type
   - Combines AI analysis with local pattern detection

3. **Model Routing**:
   - Analyzes task complexity (word count, keywords, JSON structure)
   - Selects optimal model based on capabilities and performance history
   - Tracks success rates and response times per model

4. **Error Handling**:
   - Circuit breakers prevent cascading failures
   - Automatic retry with exponential backoff
   - Detailed error messages with provider info

### Shortcut Validation
- **Structure**: Name + actions array required
- **Action Limits**: Maximum 50 actions per shortcut
- **Nested Actions**: Support for if/repeat with validation
- **Parameters**: Schema validation with Zod
- **Permissions**: Automatic tracking of required iOS permissions
- **Circular References**: Detection in nested action structures

### File Storage
- **Sharing Directory**: `shares/` for shared shortcuts
  - `shortcuts.json` - Metadata index
  - `{id}.shortcut` - Unsigned shortcut files
  - `{id}.signed.shortcut` - Signed shortcut files (if available)
  - `{id}.qr.png` - QR code images

### Action Database System
- **Comprehensive Database**: `final-action-database.json` contains 25+ iOS actions
- **AI Prompt Enhancement**: `ai-action-prompt.md` optimizes AI understanding
- **Glyph Mapping**: Maps action types to iOS SF Symbols
- **Auto-initialization**: Action database loads on server startup

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # UI components (shadcn/ui + custom)
│   │   ├── lib/          # Core utilities and types
│   │   │   ├── shortcuts.ts        # Action types & validation
│   │   │   ├── shortcut-analyzer.ts # Local analysis
│   │   │   ├── models.ts          # Model configurations
│   │   │   └── ai.ts              # AI processing interface
│   │   ├── pages/        # Application pages
│   │   └── hooks/        # React hooks
├── server/                # Express backend
│   ├── index.ts          # Main server entry (port from env or 4321)
│   ├── routes.ts         # API routes and request handling
│   ├── ai-processor.ts   # Unified AI processing
│   ├── model-router.ts   # Intelligent model selection
│   ├── circuit-breaker.ts # API resilience
│   ├── cache.ts          # Response caching
│   ├── openrouter-client.ts # OpenRouter integration
│   ├── web-search-tool.ts   # Web search capabilities
│   ├── shortcut-builder.ts  # Plist conversion
│   ├── shortcut-signer.ts   # macOS signing
│   ├── shortcut-sharing.ts  # Sharing system
│   └── vite.ts          # Dev/prod server setup
├── db/                   # Database schema and migrations
│   ├── schema.ts        # Drizzle ORM schema
│   └── index.ts         # Database connection
├── shares/              # Shared shortcuts storage
└── dist/               # Production build output
```

## Important Notes

- **Port Configuration**: Server uses `PORT` env variable or defaults to 4321 (changed from hardcoded 5000)
- **Development**: Uses tsx watch with Vite for hot reloading
- **Production**: Builds client to `dist/public`, server to `dist/`
- **AI Models**:
  - Direct: GPT-4o, Claude 3.5 Sonnet
  - OpenRouter: 100+ models available
  - Reasoning tokens supported on compatible models
- **Validation**: All shortcuts validated against defined action schemas before processing
- **Caching**: AI responses cached by model/prompt/type for performance
- **Circuit Breakers**: Prevent cascading failures from API providers
- **Web Search**: Optional but enhances AI with real-time information
- **Signing**: macOS-only feature using security(1) command-line tool
- **Sharing**: File-based system with no database dependencies for shortcuts
