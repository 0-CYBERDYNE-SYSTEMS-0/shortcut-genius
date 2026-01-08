/**
 * Agentic Shortcut Builder
 *
 * A stateful AI agent that builds iOS Shortcuts step-by-step using:
 * - OpenRouter API with function calling
 * - Prompt caching for system prompts and action database
 * - Structured outputs for validated JSON
 * - Scratchpad for maintaining state across iterations
 * - Multi-turn agentic loop for iterative refinement
 */

import { OpenRouterClient } from './openrouter-client';
import { WebSearchTool } from './web-search-tool';
import { Shortcut } from '../client/src/lib/shortcuts';
import {
  SHORTCUT_SCHEMA,
  API_DOCUMENTATION_SCHEMA,
  VALIDATION_RESULT_SCHEMA
} from './shortcut-schemas';

/**
 * Scratchpad for maintaining agent state across iterations
 */
interface Scratchpad {
  // Research findings
  apiDocumentation?: {
    serviceName: string;
    endpoint: string;
    authentication: {
      type: 'api_key' | 'bearer' | 'basic' | 'none';
      headerName?: string;
      example?: string;
    };
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    examples: string[];
  };

  // Work in progress
  currentShortcut?: Partial<Shortcut>;
  validationErrors?: string[];

  // Iteration tracking
  searchQueries: string[];
  iterationCount: number;
  decisions: Array<{
    step: string;
    reasoning: string;
    action: string;
  }>;
}

/**
 * Agent tool definitions for OpenRouter function calling
 */
export class AgentTools {
  private scratchpad: Scratchpad = {
    searchQueries: [],
    iterationCount: 0,
    decisions: []
  };

  constructor(private webSearchTool: WebSearchTool) {}

  /**
   * Get all tool definitions for OpenRouter
   */
  getToolDefinitions() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'scratchpad_write',
          description: 'Store information in scratchpad for use in later iterations. Use this to save API documentation, design decisions, or work in progress.',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                enum: ['apiDocumentation', 'currentShortcut', 'validationErrors', 'decision'],
                description: 'What type of information to store'
              },
              value: {
                type: 'object',
                description: 'The data to store (format depends on key type)'
              },
              reasoning: {
                type: 'string',
                description: 'Why you are storing this information'
              }
            },
            required: ['key', 'value', 'reasoning']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'scratchpad_read',
          description: 'Read previously stored information from scratchpad. Use this to recall API docs, current progress, or previous decisions.',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                enum: ['apiDocumentation', 'currentShortcut', 'validationErrors', 'all'],
                description: 'What information to retrieve'
              }
            },
            required: ['key']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'web_search',
          description: 'MANDATORY: Search for API documentation when user mentions external services. Use this to find real endpoints, authentication methods, and parameters. NEVER use placeholder URLs without searching first.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for API documentation (e.g., "gemini 2.5 flash image generation API documentation")'
              },
              search_type: {
                type: 'string',
                enum: ['api_docs', 'basic'],
                description: 'Type of search - use api_docs for comprehensive API documentation',
                default: 'api_docs'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'web_extract',
          description: 'Extract detailed content from specific documentation URLs. Use this after web_search to get complete API specifications.',
          parameters: {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of documentation URLs to extract from'
              },
              focus: {
                type: 'string',
                description: 'What specific information to extract (e.g., "API endpoints and authentication")'
              }
            },
            required: ['urls']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'create_shortcut_action',
          description: 'Create or update a shortcut action with validated parameters. Use this to build the shortcut step-by-step.',
          parameters: {
            type: 'object',
            properties: {
              actionType: {
                type: 'string',
                description: 'iOS Shortcut action identifier (e.g., "is.workflow.actions.getcontentsofurl")'
              },
              parameters: {
                type: 'object',
                description: 'Action parameters with real values (NO placeholders like example.com)'
              },
              position: {
                type: 'number',
                description: 'Position in actions array (0-based index)'
              }
            },
            required: ['actionType', 'parameters']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'validate_shortcut',
          description: 'Validate the current shortcut for placeholder URLs, missing parameters, or structural errors. Always run before finalizing.',
          parameters: {
            type: 'object',
            properties: {
              checkFor: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['placeholders', 'required_params', 'action_compatibility', 'permissions']
                },
                description: 'What to validate'
              }
            },
            required: ['checkFor']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'finalize',
          description: 'Return the completed shortcut. ONLY use this after successful validation with no errors.',
          parameters: {
            type: 'object',
            properties: {
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Your confidence percentage that this shortcut will work (must be >90 to finalize)'
              },
              summary: {
                type: 'string',
                description: 'Brief summary of what the shortcut does and how it works'
              }
            },
            required: ['confidence', 'summary']
          }
        }
      }
    ];
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, args: any): Promise<string> {
    this.scratchpad.iterationCount++;

    switch (toolName) {
      case 'scratchpad_write':
        return this.handleScratchpadWrite(args);

      case 'scratchpad_read':
        return this.handleScratchpadRead(args);

      case 'web_search':
        return this.handleWebSearch(args);

      case 'web_extract':
        return this.handleWebExtract(args);

      case 'create_shortcut_action':
        return this.handleCreateAction(args);

      case 'validate_shortcut':
        return this.handleValidate(args);

      case 'finalize':
        return this.handleFinalize(args);

      default:
        return `Error: Unknown tool '${toolName}'`;
    }
  }

  private handleScratchpadWrite(args: any): string {
    const { key, value, reasoning } = args;

    // Store the decision
    this.scratchpad.decisions.push({
      step: `Write to ${key}`,
      reasoning,
      action: JSON.stringify(value)
    });

    // Store the actual value
    switch (key) {
      case 'apiDocumentation':
        this.scratchpad.apiDocumentation = value;
        break;
      case 'currentShortcut':
        this.scratchpad.currentShortcut = value;
        break;
      case 'validationErrors':
        this.scratchpad.validationErrors = value;
        break;
      case 'decision':
        // Already stored above
        break;
    }

    return `Successfully stored ${key}. Reasoning: ${reasoning}`;
  }

  private handleScratchpadRead(args: any): string {
    const { key } = args;

    if (key === 'all') {
      return JSON.stringify(this.scratchpad, null, 2);
    }

    const value = this.scratchpad[key as keyof Scratchpad];
    if (!value) {
      return `No data found for key '${key}'`;
    }

    return JSON.stringify(value, null, 2);
  }

  private async handleWebSearch(args: any): Promise<string> {
    const { query, search_type = 'api_docs' } = args;

    this.scratchpad.searchQueries.push(query);

    let results;
    if (search_type === 'api_docs') {
      results = await this.webSearchTool.searchForAPIDocumentation(query);
    } else {
      results = await this.webSearchTool.search(query);
    }

    if (results.results.length === 0) {
      return `No results found for "${query}". Try a different search query.`;
    }

    let response = `Found ${results.results.length} results for "${query}":\n\n`;
    results.results.forEach((result, idx) => {
      response += `${idx + 1}. ${result.title}\n`;
      response += `   URL: ${result.url}\n`;
      response += `   ${result.snippet}\n\n`;
    });

    return response;
  }

  private async handleWebExtract(args: any): Promise<string> {
    const { urls, focus } = args;

    const results = await this.webSearchTool.extract(
      urls,
      focus || 'Extract API endpoints, authentication methods, parameters, and code examples'
    );

    if (results.results.length === 0) {
      return `Could not extract content from the provided URLs`;
    }

    let response = `Extracted content from ${results.results.length} URLs:\n\n`;
    results.results.forEach((result, idx) => {
      response += `${idx + 1}. ${result.title || 'Untitled'}\n`;
      response += `   URL: ${result.url}\n`;
      response += `   Content: ${result.raw_content.substring(0, 2000)}${result.raw_content.length > 2000 ? '...' : ''}\n\n`;
    });

    return response;
  }

  private handleCreateAction(args: any): string {
    const { actionType, parameters, position } = args;

    if (!this.scratchpad.currentShortcut) {
      this.scratchpad.currentShortcut = {
        name: 'Generated Shortcut',
        actions: []
      };
    }

    const action = {
      type: actionType,
      parameters
    };

    if (position !== undefined && this.scratchpad.currentShortcut.actions) {
      this.scratchpad.currentShortcut.actions[position] = action;
    } else {
      if (!this.scratchpad.currentShortcut.actions) {
        this.scratchpad.currentShortcut.actions = [];
      }
      this.scratchpad.currentShortcut.actions.push(action);
    }

    return `Created action: ${actionType} at position ${position || this.scratchpad.currentShortcut.actions.length - 1}`;
  }

  private handleValidate(args: any): string {
    const { checkFor } = args;

    if (!this.scratchpad.currentShortcut || !this.scratchpad.currentShortcut.actions) {
      return 'Error: No shortcut to validate. Create actions first.';
    }

    const errors: Array<{
      actionIndex: number;
      errorType: 'placeholder_url' | 'missing_parameter' | 'invalid_action' | 'permission_required';
      message: string;
    }> = [];

    const warnings: string[] = [];

    if (checkFor.includes('placeholders')) {
      // Check for placeholder URLs
      const placeholderPatterns = [
        { pattern: /example\.com/i, name: 'example.com' },
        { pattern: /api\.example/i, name: 'api.example' },
        { pattern: /placeholder/i, name: 'placeholder text' },
        { pattern: /your-api-key/i, name: 'your-api-key' },
        { pattern: /your-endpoint/i, name: 'your-endpoint' },
        { pattern: /\{api[_-]?key\}/i, name: 'API key placeholder' },
        { pattern: /\{endpoint\}/i, name: 'endpoint placeholder' }
      ];

      this.scratchpad.currentShortcut.actions.forEach((action, idx) => {
        const actionStr = JSON.stringify(action);
        placeholderPatterns.forEach(({ pattern, name }) => {
          if (pattern.test(actionStr)) {
            errors.push({
              actionIndex: idx,
              errorType: 'placeholder_url',
              message: `Action contains placeholder '${name}' - must use real API endpoint`
            });
          }
        });
      });
    }

    if (checkFor.includes('required_params')) {
      // Check for missing required parameters
      this.scratchpad.currentShortcut.actions.forEach((action, idx) => {
        if (!action.parameters || Object.keys(action.parameters).length === 0) {
          errors.push({
            actionIndex: idx,
            errorType: 'missing_parameter',
            message: `Action has no parameters - check if action requires configuration`
          });
        }

        // Check for empty parameter values
        if (action.parameters) {
          Object.entries(action.parameters).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) {
              warnings.push(`Action ${idx}: Parameter '${key}' is empty`);
            }
          });
        }
      });
    }

    if (checkFor.includes('action_compatibility')) {
      // Basic check for known action types
      const knownActions = ['is.workflow.actions.', 'com.apple.'];
      this.scratchpad.currentShortcut.actions.forEach((action, idx) => {
        if (!knownActions.some(prefix => action.type.startsWith(prefix))) {
          errors.push({
            actionIndex: idx,
            errorType: 'invalid_action',
            message: `Action type '${action.type}' may not be a valid iOS Shortcut action`
          });
        }
      });
    }

    const validationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (errors.length > 0) {
      this.scratchpad.validationErrors = errors.map(e => e.message);
      return `Validation FAILED with ${errors.length} errors:\n${JSON.stringify(validationResult, null, 2)}`;
    }

    this.scratchpad.validationErrors = [];
    const result = warnings.length > 0
      ? `Validation PASSED with ${warnings.length} warnings:\n${JSON.stringify(validationResult, null, 2)}`
      : 'Validation PASSED: No errors found. Shortcut is ready to finalize.';

    return result;
  }

  private handleFinalize(args: any): string {
    const { confidence, summary } = args;

    if (confidence < 90) {
      return `Error: Confidence ${confidence}% is too low. Must be >90% to finalize. Continue iterating.`;
    }

    if (this.scratchpad.validationErrors && this.scratchpad.validationErrors.length > 0) {
      return `Error: Cannot finalize with ${this.scratchpad.validationErrors.length} validation errors. Fix them first.`;
    }

    return `FINALIZE_SUCCESS:${JSON.stringify({
      shortcut: this.scratchpad.currentShortcut,
      confidence,
      summary,
      iterations: this.scratchpad.iterationCount,
      searchesPerformed: this.scratchpad.searchQueries.length
    })}`;
  }

  getScratchpad(): Scratchpad {
    return this.scratchpad;
  }

  resetScratchpad(): void {
    this.scratchpad = {
      searchQueries: [],
      iterationCount: 0,
      decisions: []
    };
  }
}

/**
 * Agentic Shortcut Builder
 * Orchestrates the multi-turn conversation with tool calling
 */
export class AgenticShortcutBuilder {
  private agentTools: AgentTools;

  constructor(
    private openrouter: OpenRouterClient,
    private webSearchTool: WebSearchTool,
    private actionDatabasePrompt: string
  ) {
    this.agentTools = new AgentTools(webSearchTool);
  }

  /**
   * Build a shortcut using agentic loop with OpenRouter
   */
  async buildShortcut(
    userRequest: string,
    model: string = 'anthropic/claude-3.5-sonnet',
    maxIterations: number = 15
  ): Promise<{
    shortcut: Shortcut;
    metadata: {
      iterations: number;
      searchesPerformed: number;
      confidence: number;
      summary: string;
    }
  }> {
    this.agentTools.resetScratchpad();

    const messages: any[] = [];
    const tools = this.agentTools.getToolDefinitions();

    // System prompt with caching enabled
    const systemPrompt = this.buildSystemPrompt();

    // Initial user message
    messages.push({
      role: 'user',
      content: userRequest
    });

    let iteration = 0;
    let isComplete = false;
    let finalResult: any = null;

    console.log(`🤖 Starting agentic loop for: "${userRequest}"`);

    while (!isComplete && iteration < maxIterations) {
      iteration++;
      console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);

      try {
        // Detect if user request mentions external APIs/services
        const mentionsExternalService = this.detectsExternalAPI(userRequest, messages);

        // Force tool usage if external service detected and no searches performed yet
        const toolChoice = mentionsExternalService && this.agentTools.getScratchpad().searchQueries.length === 0
          ? 'required'  // FORCE tool usage on first iteration for external APIs
          : 'auto';

        console.log(`  Tool choice: ${toolChoice} (external API: ${mentionsExternalService})`);

        // Call OpenRouter with tools
        const response = await this.openrouter.createChatCompletion({
          model,
          messages: [
            {
              role: 'system',
              content: [
                {
                  type: 'text',
                  text: systemPrompt,
                  cache_control: { type: 'ephemeral' } // Cache the system prompt
                }
              ]
            },
            ...messages
          ],
          tools,
          tool_choice: toolChoice,
          temperature: 0.7,
          max_tokens: 4096
        });

        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage);

        // Check for tool calls
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          console.log(`🔧 Processing ${assistantMessage.tool_calls.length} tool calls`);

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            console.log(`  → ${toolName}:`, JSON.stringify(toolArgs).substring(0, 100));

            // Execute the tool
            const toolResult = await this.agentTools.executeTool(toolName, toolArgs);

            // Check for finalize
            if (toolName === 'finalize' && toolResult.startsWith('FINALIZE_SUCCESS:')) {
              isComplete = true;
              finalResult = JSON.parse(toolResult.replace('FINALIZE_SUCCESS:', ''));
              break;
            }

            // Add tool result to conversation
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult
            });

            console.log(`  ✓ Result: ${toolResult.substring(0, 100)}${toolResult.length > 100 ? '...' : ''}`);
          }
        } else {
          // No tool calls, just text response
          console.log(`💬 Text response: ${assistantMessage.content?.substring(0, 150)}`);
        }

      } catch (error) {
        console.error(`❌ Error in iteration ${iteration}:`, error);
        throw error;
      }
    }

    if (!isComplete) {
      throw new Error(`Agent did not complete task within ${maxIterations} iterations`);
    }

    console.log(`\n✅ Agent completed successfully in ${iteration} iterations`);

    return {
      shortcut: finalResult.shortcut as Shortcut,
      metadata: {
        iterations: finalResult.iterations,
        searchesPerformed: finalResult.searchesPerformed,
        confidence: finalResult.confidence,
        summary: finalResult.summary
      }
    };
  }

  /**
   * Detect if the user request mentions external APIs or services
   */
  private detectsExternalAPI(userRequest: string, messages: any[]): boolean {
    const externalServiceKeywords = [
      'api', 'gemini', 'gpt', 'openai', 'claude', 'weather',
      'endpoint', 'service', 'rest', 'http', 'request',
      'google', 'microsoft', 'amazon', 'aws', 'azure',
      'image generation', 'text generation', 'ai model',
      'llm', 'vision', 'translate', 'analyze'
    ];

    const fullConversation = [
      userRequest,
      ...messages.map((m: any) => m.content || '')
    ].join(' ').toLowerCase();

    return externalServiceKeywords.some(keyword =>
      fullConversation.includes(keyword.toLowerCase())
    );
  }

  private buildSystemPrompt(): string {
    return `The assistant is in a meticulous stateful iOS Shortcuts builder kind of mood. The assistant builds shortcuts step-by-step using MANDATORY function calling.

# ABSOLUTE REQUIREMENTS - FAILURE = REJECTION:

1. **YOU MUST CALL web_search FIRST**
   - If user mentions ANY service name (Gemini, GPT, Weather, etc.), your FIRST action MUST be web_search
   - DO NOT proceed to create_shortcut_action without searching first
   - Example: User says "gemini API" → YOU MUST call web_search("gemini 2.5 flash API documentation")

2. **ZERO TOLERANCE for placeholder URLs**
   - If validation finds example.com, api.example, or ANY placeholder → YOU FAILED
   - Your shortcut will be REJECTED if it contains placeholders
   - Every URL MUST come from actual API documentation you searched for

3. **MANDATORY workflow enforcement**
   - EVERY external API task follows this EXACT order:
     a) scratchpad_write → "Need to find [SERVICE] API docs"
     b) web_search → "official [SERVICE] API documentation endpoint authentication"
     c) web_extract → Extract from search results
     d) scratchpad_write → Store endpoint, auth, params
     e) create_shortcut_action → Use ONLY the URLs you found
     f) validate_shortcut → Must pass with zero errors
     g) finalize → Only if confidence >90%

# TOOL CALLING RULES:

**web_search tool:**
- WHEN: User mentions ANY external service/API (Gemini, OpenAI, weather, etc.)
- MUST USE: Before creating ANY action that calls external services
- QUERY FORMAT: "[service name] official API documentation endpoint authentication parameters"
- Examples:
  - "gemini 2.5 flash official API documentation endpoint authentication"
  - "openai gpt-4 vision API documentation endpoint parameters"

**scratchpad_write tool:**
- Use to store: API docs, endpoints, decisions, progress
- ALWAYS write why you're storing something

**scratchpad_read tool:**
- Use BEFORE creating actions to recall what you learned

**create_shortcut_action tool:**
- ONLY use URLs from scratchpad (that came from web_search)
- NEVER use placeholder URLs - validation will catch and reject

**validate_shortcut tool:**
- MUST run before finalize
- If ANY errors → go back to web_search with better query

**finalize tool:**
- ONLY after: validation passed + confidence >90%

# YOUR EXACT WORKFLOW (MUST FOLLOW):

Iteration 1: Analyze + Search
- Read user request
- Identify service name (e.g., "gemini-2.5-flash")
- scratchpad_write: "Need API docs for [service]"
- web_search: "[service] official API documentation"

Iteration 2: Extract + Store
- scratchpad_read: Check search results
- web_extract: Get endpoint URLs from top results
- scratchpad_write: Store { endpoint, auth, params }

Iteration 3: Build
- scratchpad_read: Get API details
- create_shortcut_action: Use REAL URLs from scratchpad

Iteration 4: Validate
- validate_shortcut: Check for placeholders
- If errors: MUST return to web_search with refined query
- If pass: proceed to finalize

Iteration 5: Finalize
- finalize: Return completed shortcut

# DETECTION EXAMPLES:

❌ BAD (will be rejected):
- Any action with "example.com"
- Any action with "api.example"
- Any action with "{api_key}" or "YOUR_API_KEY"
- Creating actions without web_search first

✅ GOOD:
- web_search → scratchpad_write → create_shortcut_action (with real URL)
- Validation passes with zero placeholder errors
- Every URL traceable to web_search results

# AVAILABLE iOS SHORTCUT ACTIONS:

${this.actionDatabasePrompt}

# CRITICAL REMINDERS:

- NO exceptions to web_search requirement for external APIs
- scratchpad is your memory - use it constantly
- Validation failure = you must search again with better query
- finalize ONLY works if validation passed AND confidence >90%

START by: (1) Identify if user mentioned external service, (2) If yes → IMMEDIATELY call web_search`;
  }
}
