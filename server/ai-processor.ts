import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import { OpenRouterClient } from './openrouter-client';
import { WebSearchTool } from './web-search-tool';
import { AIActionEnhancer } from './ai-action-enhancer';
import { GlyphMappingSystem } from './glyph-mapping-system';
import {
  getModelConfig,
  isOpenRouterModel,
  isCustomProvider,
  getOpenRouterModelName,
  supportsReasoning,
  supportsVerbosity,
  DEFAULT_REASONING_OPTIONS,
  CUSTOM_PROVIDER_PREFIXES,
} from '../client/src/lib/models';
import { loadProviders, PROVIDER_URLS, type ProviderName } from './providers';
import { SHORTCUT_ACTIONS } from '../client/src/lib/shortcuts';
import { AIModel, ReasoningOptions } from '../client/src/lib/types';
import { getAiActionPromptPath, getFinalActionDatabasePath } from './runtime-config';

interface AIProcessorOptions {
  openai: OpenAI;
  anthropic: Anthropic;
  openrouter: OpenRouterClient;
  webSearchTool?: WebSearchTool;
}

interface ProcessRequest {
  model: AIModel;
  prompt: string;
  type: 'generate' | 'analyze';
  systemPrompt: string;
  reasoningOptions?: ReasoningOptions;
  useComprehensiveActions?: boolean;
  allowTools?: boolean;
}

interface ProcessResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
  };
}

export class AIProcessor {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private openrouter: OpenRouterClient;
  private webSearchTool?: WebSearchTool;
  private actionEnhancer: AIActionEnhancer;
  private glyphSystem: GlyphMappingSystem;
  private comprehensiveActionDatabase: any = null;
  private aiPrompt: string = '';
  private initialized: boolean = false;

  constructor(options: AIProcessorOptions) {
    this.openai = options.openai;
    this.anthropic = options.anthropic;
    this.openrouter = options.openrouter;
    this.webSearchTool = options.webSearchTool;
    this.actionEnhancer = new AIActionEnhancer();
    this.glyphSystem = new GlyphMappingSystem();
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.actionEnhancer.initialize();
      await this.loadComprehensiveActionDatabase();
      this.initialized = true;
    }
  }

  private async loadComprehensiveActionDatabase(): Promise<void> {
    try {
      // Load final comprehensive database
      const databasePath = getFinalActionDatabasePath();
      const data = await fs.readFile(databasePath, 'utf8');
      this.comprehensiveActionDatabase = JSON.parse(data);

      // Load optimized AI prompt
      const promptPath = getAiActionPromptPath();
      const promptData = await fs.readFile(promptPath, 'utf8');
      this.aiPrompt = promptData;

      console.log(`Loaded comprehensive action database with ${Object.keys(this.comprehensiveActionDatabase).length} actions`);
    } catch (error) {
      console.log('Could not load comprehensive database, falling back to action enhancer');
      this.comprehensiveActionDatabase = null;
    }
  }

  async enhancePrompt(prompt: string, type: 'generate' | 'analyze' = 'generate'): Promise<{ enhancedPrompt: string; actionSuggestions: any[] }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const enhancedRequest = {
      prompt,
      model: 'gpt-4o',
      mode: type
    };

    const enhancedResponse = await this.actionEnhancer.enhanceShortcutRequest(enhancedRequest);
    return {
      enhancedPrompt: enhancedResponse.enhancedPrompt,
      actionSuggestions: enhancedResponse.actions
    };
  }

  getActionDatabase(): any {
    return this.actionEnhancer.getActionDatabase();
  }

  getGlyphForAction(actionIdentifier: string): string {
    return this.glyphSystem.getGlyphForAction(actionIdentifier);
  }

  async process(request: ProcessRequest): Promise<ProcessResult> {
    const { model, prompt, type, systemPrompt, reasoningOptions } = request;
    const modelConfig = getModelConfig(model);

    if (isCustomProvider(model)) {
      return this.processCustomProvider(request);
    }

    if (isOpenRouterModel(model)) {
      return this.processOpenRouter(request);
    }

    if (modelConfig.provider === 'openai') {
      if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
        const openRouterRequest: ProcessRequest = {
          model: `openai/${model}`,
          prompt,
          type,
          systemPrompt,
          reasoningOptions
        };
        return this.processOpenRouter(openRouterRequest);
      }
      return this.processOpenAI(request);
    }

    if (modelConfig.provider === 'anthropic') {
      return this.processAnthropic(request);
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  private async processOpenAI(request: ProcessRequest): Promise<ProcessResult> {
    const { model, prompt, type, systemPrompt, reasoningOptions, useComprehensiveActions, allowTools } = request;
    const modelConfig = getModelConfig(model);
    const toolsEnabled = allowTools !== false;

    // Prepare messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(systemPrompt, type, useComprehensiveActions) },
      { role: 'user', content: this.buildUserPrompt(prompt, type, useComprehensiveActions) }
    ];

    // Build request parameters
    const requestParams: any = {
      model: this.getOpenAIModelName(model),
      messages,
      temperature: 0.7,
      max_tokens: modelConfig.capabilities.maxTokens || 4096
    };

    // Add web search tools if available
    if (this.webSearchTool && toolsEnabled) {
      requestParams.tools = this.webSearchTool.getAllToolDefinitions();
      requestParams.tool_choice = 'auto';
    }

    // Add reasoning parameters for models that support it
    if (supportsReasoning(model) && reasoningOptions) {
      if (reasoningOptions.reasoning_effort) {
        requestParams.reasoning_effort = reasoningOptions.reasoning_effort;
      }
      if (reasoningOptions.verbosity) {
        requestParams.verbosity = reasoningOptions.verbosity;
      }
    }

    // Add JSON mode for generation (but not when using tools)
    if ((type === 'generate' || type === 'analyze') && !toolsEnabled) {
      requestParams.response_format = { type: 'json_object' };
    }

    try {
      let response = await this.openai.chat.completions.create(requestParams);
      let content = response.choices[0].message.content || '';

      // Handle function calls
      const toolCalls = response.choices[0].message.tool_calls;
      if (toolCalls && this.webSearchTool && toolsEnabled) {
        for (const toolCall of toolCalls) {
          if (['web_search', 'web_extract', 'web_crawl'].includes(toolCall.function.name)) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const toolResults = await this.webSearchTool.executeToolCall(toolCall.function.name, args);

              // Add the tool result to the conversation
              messages.push(response.choices[0].message);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResults
              });

              // Make another request with the tool results
              const followUpParams = {
                ...requestParams,
                messages,
                tools: undefined, // Remove tools to avoid infinite loops
                tool_choice: undefined
              };

              // Add JSON mode back for final response
              if (type === 'generate' || type === 'analyze') {
                followUpParams.response_format = { type: 'json_object' };
              }

              response = await this.openai.chat.completions.create(followUpParams);
              content = response.choices[0].message.content || '';
            } catch (toolError) {
              console.error('Tool execution error:', toolError);
              // Continue with original response if tool fails
            }
          }
        }
      }

      return {
        content,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
          reasoning_tokens: (response.usage as any)?.completion_tokens_details?.reasoning_tokens
        }
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  private async processAnthropic(request: ProcessRequest): Promise<ProcessResult> {
    const { model, prompt, type, systemPrompt, useComprehensiveActions, allowTools } = request;
    const modelConfig = getModelConfig(model);
    const toolsEnabled = allowTools !== false;

    const messages: any[] = [{
      role: 'user',
      content: this.buildUserPrompt(prompt, type, useComprehensiveActions)
    }];

    const requestParams: any = {
      model: this.getAnthropicModelName(model),
      system: this.buildSystemPrompt(systemPrompt, type, useComprehensiveActions),
      messages,
      temperature: 0.7,
      max_tokens: modelConfig.capabilities.maxTokens || 8192
    };

    // Add web search tools if available
    if (this.webSearchTool && toolsEnabled) {
      const toolDefinitions = this.webSearchTool.getAllOpenRouterToolDefinitions();
      requestParams.tools = toolDefinitions.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));
    }

    try {
      let response = await this.anthropic.messages.create(requestParams);
      let content = (response.content[0] as any)?.text || '';

      // Handle function calls
      const toolUse = response.content.find((c: any) => c.type === 'tool_use');
      if (toolUse && this.webSearchTool && ['web_search', 'web_extract', 'web_crawl'].includes(toolUse.name)) {
        try {
          const toolResults = await this.webSearchTool.executeToolCall(toolUse.name, toolUse.input);

          // Add the tool result to the conversation
          messages.push({ role: 'assistant', content: response.content });
          messages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResults
            }]
          });

          // Make another request with the tool results
          response = await this.anthropic.messages.create({
            ...requestParams,
            messages,
            tools: undefined // Remove tools to avoid infinite loops
          });

          content = (response.content[0] as any)?.text || '';
        } catch (toolError) {
          console.error('Tool execution error:', toolError);
          // Continue with original response if tool fails
        }
      }

      return {
        content,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error: any) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  private async processOpenRouter(request: ProcessRequest): Promise<ProcessResult> {
    const { model, prompt, type, systemPrompt, reasoningOptions, useComprehensiveActions, allowTools } = request;
    const modelConfig = getModelConfig(model);
    const openRouterModelName = getOpenRouterModelName(model);
    const toolsEnabled = allowTools !== false;

    const messages = [
      { role: 'system' as const, content: this.buildSystemPrompt(systemPrompt, type, useComprehensiveActions) },
      { role: 'user' as const, content: this.buildUserPrompt(prompt, type, useComprehensiveActions) }
    ];

    const requestData: any = {
      model: openRouterModelName,
      messages,
      temperature: 0.7,
      max_tokens: modelConfig.capabilities.maxTokens || 4096,
      ...reasoningOptions
    };

    // Add web search tools if available (OpenRouter function calling format)
    if (this.webSearchTool && toolsEnabled) {
      requestData.tools = this.webSearchTool.getAllOpenRouterToolDefinitions();
      requestData.tool_choice = 'auto';
    }

    try {
      let response = await this.openrouter.createChatCompletion(requestData);
      let content = response.choices[0].message.content || '';

      // Handle function calls (OpenRouter format)
      const toolCalls = response.choices[0].message.tool_calls;
      if (toolCalls && this.webSearchTool && toolsEnabled) {
        for (const toolCall of toolCalls) {
          if (['web_search', 'web_extract', 'web_crawl'].includes(toolCall.function.name)) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const toolResults = await this.webSearchTool.executeToolCall(toolCall.function.name, args);

              // Add the tool result to the conversation
              messages.push(response.choices[0].message);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResults
              });

              // Make another request with the tool results
              const followUpData = {
                ...requestData,
                messages,
                tools: undefined, // Remove tools to avoid infinite loops
                tool_choice: undefined
              };

              response = await this.openrouter.createChatCompletion(followUpData);
              content = response.choices[0].message.content || '';
            } catch (toolError) {
              console.error('Tool execution error:', toolError);
              // Continue with original response if tool fails
            }
          }
        }
      }

      return {
        content,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        }
      };
    } catch (error: any) {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }

  private buildSystemPrompt(basePrompt: string, type: string, useComprehensiveActions?: boolean): string {
    let systemPrompt = basePrompt;

    // Add comprehensive action database knowledge
    if (useComprehensiveActions !== false && this.comprehensiveActionDatabase && this.aiPrompt) {
      systemPrompt += '\n\n' + this.aiPrompt;
    }

    if (type === 'generate') {
      systemPrompt += '\n\nRespond ONLY with a valid JSON shortcut object following the exact structure from the example.';
    } else {
      systemPrompt += '\n\nAnalyze the shortcut and respond with a valid JSON analysis object.';
    }

    return systemPrompt;
  }

  private buildUserPrompt(prompt: string, type: string, useComprehensiveActions?: boolean): string {
    if (type === 'generate') {
      let actionPrompt = '';

      if (useComprehensiveActions !== false && this.comprehensiveActionDatabase) {
        const availableActions = Object.keys(this.comprehensiveActionDatabase).length;

        // Get actions by category for better organization
        const categories: Record<string, any[]> = {};
        Object.values(this.comprehensiveActionDatabase).forEach((action: any) => {
          if (!categories[action.category]) {
            categories[action.category] = [];
          }
          categories[action.category].push(action);
        });

        actionPrompt = `

AVAILABLE ACTIONS DATABASE (${availableActions} verified actions):

${Object.entries(categories).slice(0, 8).map(([category, actions]) => `
**${category.toUpperCase()}** (${actions.length} actions):
${actions.slice(0, 3).map((action: any) => `  • ${action.name} (\`${action.identifier}\`)
    ${action.parameters.length > 0 ? `Parameters: ${action.parameters.map((p: any) => p.key).join(', ')}` : 'No parameters'}
    Permissions: ${action.permissions}`).join('\n')}
`).join('')}

*Use only these verified action identifiers in your response. All required parameters must be included.*`;
      } else {
        // Fallback to simplified in-app action list (matches validation)
        const availableActions = Object.keys(SHORTCUT_ACTIONS).length;
        actionPrompt = `

IMPORTANT: Use only the following verified iOS Shortcuts actions (${availableActions} available):
${Object.entries(SHORTCUT_ACTIONS).map(([id, action]) =>
  `- ${action.name}: ${id}\n  Parameters: ${action.parameters.join(', ')}`
).join('\n')}`;
      }

      return `Create a shortcut that ${prompt}.${actionPrompt}

Return only valid JSON in this exact format:
{
  "name": "Shortcut Name",
  "actions": [
    {
      "type": "action_identifier_here",
      "parameters": {
        "parameter_key": "parameter_value"
      }
    }
  ]
}

IMPORTANT:
- Use only the action identifiers listed above
- Include all required parameters for each action
- Use proper parameter keys as shown in the action descriptions
- Use iOS Shortcuts action identifiers (is.workflow.actions.* or com.apple.*) when possible
- For API calls, prefer "Get Contents of URL" and include method/headers/body parameters as needed
- Consider permission requirements
- Match input/output types between connected actions`;
    } else {
      return `Analyze this shortcut and suggest improvements: ${prompt}`;
    }
  }

  private async processCustomProvider(request: ProcessRequest): Promise<ProcessResult> {
    const { model, prompt, type, systemPrompt, useComprehensiveActions } = request;

    // Determine provider name from prefix (e.g. "glm/glm-4" → "glm")
    const prefix = CUSTOM_PROVIDER_PREFIXES.find(p => model.startsWith(p));
    if (!prefix) throw new Error(`Unknown custom provider for model: ${model}`);

    // Provider key is the prefix without slash and without -direct suffix
    const providerName = prefix.replace('/', '').replace('-direct', '') as ProviderName;
    const store = await loadProviders();
    const providerCfg = store[providerName];
    const apiKey = providerCfg?.apiKey || providerCfg?.oauthToken;

    if (!apiKey) {
      throw new Error(`${providerName} API key not configured. Add it in Model Settings → Providers.`);
    }

    const baseURL = PROVIDER_URLS[providerName];
    // Strip the "prefix/" from the model ID to get the raw model name for the API
    const rawModel = model.startsWith(prefix) ? model.slice(prefix.length) : model;

    const client = new OpenAI({ apiKey, baseURL, timeout: 60000 });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(systemPrompt, type, useComprehensiveActions) },
      { role: 'user', content: this.buildUserPrompt(prompt, type, useComprehensiveActions) },
    ];

    const response = await client.chat.completions.create({
      model: rawModel,
      messages,
      temperature: 0.7,
      max_tokens: 8192,
    });

    const msg = response.choices[0].message as any;
    // GLM-4.7 (and other reasoning models) may return content in reasoning_content when content is empty
    const content = msg.content || msg.reasoning_content || '';
    return {
      content,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private getOpenAIModelName(model: AIModel): string {
    // Map internal model names to OpenAI API names
    switch (model) {
      case 'gpt-4o': return 'gpt-4o';
      case 'gpt-4-1': return 'gpt-4.1';
      case 'gpt-4-1-mini': return 'gpt-4.1-mini';
      case 'gpt-4-1-nano': return 'gpt-4.1-nano';
      case 'gpt-5': return 'gpt-5';
      case 'gpt-5-mini': return 'gpt-5-mini';
      case 'gpt-5-nano': return 'gpt-5-nano';
      case 'o3': return 'o3';
      case 'o3-mini': return 'o3-mini';
      case 'o4-mini': return 'o4-mini';
      default: return model;
    }
  }

  private getAnthropicModelName(model: AIModel): string {
    // Map internal model names to Anthropic API names
    switch (model) {
      case 'claude-3-5-sonnet-20241022': return 'claude-3-5-sonnet-20241022';
      default: return model;
    }
  }

  getAvailableModels(): AIModel[] {
    const directModels = [
      // OpenAI Direct Models
      'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo',
      // Anthropic Direct Models
      'claude-3-5-sonnet-20241022'
    ];

    // Allow any provider/model format for OpenRouter (this enables ANY OpenRouter model)
    // This means users can use any model they find from the OpenRouter API
    return directModels;
  }

  checkApiKeyAvailability(model: AIModel): { available: boolean; error?: string } {
    const modelConfig = getModelConfig(model);

    if (isOpenRouterModel(model)) {
      if (!process.env.OPENROUTER_API_KEY) {
        return { available: false, error: 'OpenRouter API key not configured' };
      }
    } else if (modelConfig.provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        if (process.env.OPENROUTER_API_KEY) {
          return { available: true };
        }
        return { available: false, error: 'OpenAI API key not configured' };
      }
    } else if (modelConfig.provider === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { available: false, error: 'Anthropic API key not configured' };
      }
    }

    return { available: true };
  }
}
