# Agentic Architecture Implementation

## Overview

We've successfully implemented a **stateful AI agent architecture** to replace the single-shot AI processing system. This eliminates placeholder URLs by forcing the AI to search for real API documentation before generating shortcuts.

## Key Features

### 1. **Stateful Agent with Scratchpad**
- Maintains context across multiple iterations
- Stores API documentation findings
- Tracks design decisions and reasoning
- Persists current work-in-progress

### 2. **Multi-Turn Agentic Loop**
- Iterative refinement until shortcut is perfect
- Maximum 15-20 iterations (configurable)
- Agent can self-correct based on validation errors
- Continues until confidence > 90%

### 3. **Seven Agent Tools** (Function Calling)

#### `scratchpad_write`
Store information for later use (API docs, current shortcut, decisions)

#### `scratchpad_read`
Retrieve previously stored information

#### `web_search` (MANDATORY for APIs)
Search for API documentation when user mentions services
- Supports `api_docs` search type for comprehensive results
- Integrated with Tavily, Serper, Brave, or DuckDuckGo

#### `web_extract`
Extract detailed content from specific documentation URLs

#### `create_shortcut_action`
Create or update shortcut actions with real parameters

#### `validate_shortcut`
Check for:
- Placeholder URLs (example.com, api.example, etc.)
- Missing required parameters
- Invalid action types
- Empty parameter values

#### `finalize`
Return completed shortcut (only when confidence > 90%)

### 4. **OpenRouter Integration**

#### Prompt Caching
- System prompt cached with `cache_control: { type: 'ephemeral' }`
- Reduces costs by 75-90% for repeated requests
- Works automatically with Anthropic models
- Cache expires in 5 minutes

#### Structured Outputs
- JSON Schema validation for shortcuts
- Ensures type-safe responses
- Prevents hallucinated fields
- Schemas defined in `server/shortcut-schemas.ts`

#### Function Calling
- Full tool calling support
- Parallel tool calls enabled
- Interleaved thinking for complex reasoning
- Streaming support for real-time responses

### 5. **Enhanced Validation**

Placeholder detection now catches:
- `example.com`
- `api.example`
- `placeholder`
- `your-api-key`
- `your-endpoint`
- `{api_key}` / `{endpoint}` patterns

Validation returns structured errors:
```typescript
{
  isValid: boolean,
  errors: Array<{
    actionIndex: number,
    errorType: 'placeholder_url' | 'missing_parameter' | 'invalid_action',
    message: string
  }>,
  warnings: string[]
}
```

## Architecture

### Before (Single-Shot):
```
User Request → Single AI Call → Optional Tool Use → Return Result
```

**Problems:**
- ❌ No state persistence
- ❌ No iterative refinement
- ❌ No error recovery
- ❌ Web search optional (agent ignores it)

### After (Agentic):
```
User Request
  ↓
Agent Loop {
  1. Scratchpad: Read current state
  2. Reasoning: What do I need to do next?
  3. Tool Selection: web_search / code_edit / validate
  4. Tool Execution: Perform action
  5. Scratchpad: Update state with results
  6. Decision: Done or continue loop?
}
  ↓
Validated Result (No Placeholders!)
```

## System Prompt Strategy

The agent is instructed with **CRITICAL RULES**:

1. **NEVER use placeholder URLs** - Forbidden patterns listed
2. **ALWAYS search first** - Web search before creating API actions
3. **Use scratchpad** - Maintain state across iterations
4. **Validate before finalizing** - Check for placeholders
5. **Iterate until perfect** - Don't finalize until 90%+ confidence

## Example Agent Flow

```
User: "Build shortcut using gemini-2.5-flash for image generation"

Iteration 1:
- scratchpad_write: "Need to find Gemini 2.5 Flash API docs"
- web_search: "gemini 2.5 flash image generation API documentation"
- scratchpad_write: "Found endpoint: https://generativelanguage.googleapis.com/..."

Iteration 2:
- scratchpad_read: Check what we learned
- web_extract: Get detailed API parameters
- scratchpad_write: "Needs API key in header, accepts image/prompt"

Iteration 3:
- create_shortcut_action: Create actions with REAL URLs
- scratchpad_write: "Created shortcut v1"

Iteration 4:
- validate_shortcut: Check for placeholders
- Result: "Valid! No placeholders found"

Iteration 5:
- finalize: Return completed shortcut
```

## API Endpoints

### `/api/agentic/generate` (NEW)

**Request:**
```json
{
  "prompt": "Create shortcut that uses gemini-2.5-flash...",
  "model": "anthropic/claude-3.5-sonnet",
  "maxIterations": 15
}
```

**Response:**
```json
{
  "shortcut": { ... },
  "metadata": {
    "mode": "agentic",
    "iterations": 5,
    "searchesPerformed": 2,
    "confidence": 95,
    "summary": "Created shortcut that integrates with Gemini..."
  }
}
```

### `/api/process` (Existing)
Still available for backward compatibility, but uses old single-shot method.

## Files Added

### Core Implementation
- `server/agentic-shortcut-builder.ts` - Main agent orchestration (620 lines)
- `server/shortcut-schemas.ts` - Structured output schemas (150 lines)

### Testing
- `test-agentic-gemini.ts` - Test script for Gemini API integration

### Configuration
- Updated `server/routes.ts` - Added agentic endpoint and initialization

## Usage

### From API:
```bash
curl -X POST http://localhost:4321/api/agentic/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create shortcut that uses gemini-2.5-flash-image-generation",
    "model": "anthropic/claude-3.5-sonnet"
  }'
```

### From Code:
```typescript
import { AgenticShortcutBuilder } from './server/agentic-shortcut-builder';

const builder = new AgenticShortcutBuilder(
  openrouter,
  webSearchTool,
  actionDatabasePrompt
);

const result = await builder.buildShortcut(
  userRequest,
  'anthropic/claude-3.5-sonnet',
  15 // max iterations
);
```

## Benefits

### 1. **No More Placeholders**
- Agent **forced** to search for real APIs
- Validation prevents finalization with placeholders
- Iterative refinement until URLs are real

### 2. **Better Quality**
- Multi-turn reasoning produces more accurate shortcuts
- Agent can self-correct mistakes
- Confidence score ensures quality threshold

### 3. **Cost Effective**
- Prompt caching reduces API costs by 75-90%
- Structured outputs prevent parsing errors
- Web search results cached by Tavily

### 4. **Observable**
- Detailed metadata on iterations, searches, confidence
- Scratchpad provides full reasoning trace
- Validation errors clearly identified

## Next Steps

### Frontend Integration
- Add "Agentic Mode" toggle in UI
- Display iteration progress in real-time
- Show agent reasoning/decisions to user

### Enhanced Tools
- Add `web_crawl` tool for comprehensive documentation
- Add `code_test` tool to validate generated shortcuts
- Add `permission_check` tool for iOS compatibility

### Performance Optimization
- Implement tool result caching
- Add parallel tool execution where possible
- Optimize system prompt length

## Testing

Run the test script:
```bash
npx tsx test-agentic-gemini.ts
```

Expected output:
- Agent searches for Gemini API documentation
- Finds real endpoint URLs
- Creates shortcut with actual API configuration
- Validates (should pass with no placeholders)
- Returns result with 90%+ confidence

## Branch

All changes are in: `feature/agentic-architecture-openrouter`

Commit: `1a281ff - Implement agentic architecture with OpenRouter`
