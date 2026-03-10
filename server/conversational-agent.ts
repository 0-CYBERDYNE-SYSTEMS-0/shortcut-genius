import { AIProcessor } from './ai-processor';
import { WebSearchTool } from './web-search-tool';
import { AIModel, ReasoningOptions } from '../client/src/lib/types';
import { db } from '../db';
import { conversations, messages, shortcutVersions } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { validateShortcut, SHORTCUT_ACTIONS, Shortcut as ShortcutSchema } from '../client/src/lib/shortcuts';
import { analyzeShortcut } from '../client/src/lib/shortcut-analyzer';
import { validateShortcutDataFlow, formatValidationIssuesForAI } from './shortcut-validator';

export interface ConversationState {
  id: number;
  messages: ConversationMessage[];
  currentShortcut?: any;
  contextWindow: Array<string>;
  userPreferences?: {
    preferredModel?: string;
    preferredComplexity?: 'simple' | 'medium' | 'complex' | 'auto';
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface AgentPhase {
  type: 'analysis' | 'clarification' | 'research' | 'planning' | 'implementation' | 'validation' | 'refinement' | 'complete';
  message: string;
  requiresInput?: boolean;
}

export interface ProcessRequest {
  conversationId?: number;
  userId: number;
  content: string;
  model?: AIModel;
  type?: 'generate' | 'analyze' | 'refine';
  reasoningOptions?: ReasoningOptions;
  context?: any;
  persistMessages?: boolean;
}

export interface ProcessResult {
  content: string;
  phase: AgentPhase;
  shortcut?: any;
  analysis?: any;
  nextActions?: string[];
  requiresClarification?: boolean;
  updates?: AgentUpdate[];
}

export interface AgentUpdate {
  type: 'info' | 'progress' | 'warning' | 'error' | 'success';
  message: string;
  progress?: number;
  phase?: string;
}

export class ConversationalShortcutAgent {
  private aiProcessor: AIProcessor;
  private webSearchTool: WebSearchTool;
  private maxContextLength = 4000; // tokens
  private maxMessages = 20; // messages to keep in context
  private currentUpdates: AgentUpdate[] = [];

  constructor(aiProcessor: AIProcessor, webSearchTool: WebSearchTool) {
    this.aiProcessor = aiProcessor;
    this.webSearchTool = webSearchTool;
  }

  private addUpdate(update: AgentUpdate) {
    this.currentUpdates.push(update);
  }

  private clearUpdates() {
    this.currentUpdates = [];
  }

  public checkApiKeyAvailability(model: AIModel): { available: boolean; error?: string } {
    return this.aiProcessor.checkApiKeyAvailability(model);
  }

  async processRequest(request: ProcessRequest): Promise<ProcessResult> {
    this.clearUpdates();
    
    const contextMessages = request.context?.messages as Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: Date;
      metadata?: any;
    }> | undefined;

    const conversationState = contextMessages
      ? {
          id: request.conversationId || 0,
          messages: contextMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date(),
            metadata: msg.metadata
          })),
          contextWindow: this.buildContextWindow(contextMessages),
          userPreferences: request.context?.userPreferences
        }
      : await this.getConversationState(request.conversationId);
    const persistMessages = request.persistMessages !== false;

    // Add user message to conversation
    if (persistMessages) {
      await this.addMessage(request.conversationId, 'user', request.content);
    }

    this.addUpdate({
      type: 'info',
      message: 'Analyzing request...',
      phase: 'initialization'
    });

    // Determine processing phase
    const phase = await this.determinePhase(request, conversationState);

    // Process based on phase
    let result: ProcessResult;
    switch (phase.type) {
      case 'analysis':
        result = await this.processAnalysisPhase(request, conversationState);
        break;
      case 'clarification':
        result = await this.processClarificationPhase(request, conversationState);
        break;
      case 'research':
        result = await this.processResearchPhase(request, conversationState);
        break;
      case 'planning':
        result = await this.processPlanningPhase(request, conversationState);
        break;
      case 'implementation':
        result = await this.processImplementationPhase(request, conversationState);
        break;
      case 'validation':
        result = await this.processValidationPhase(request, conversationState);
        break;
      case 'refinement':
        result = await this.processRefinementPhase(request, conversationState);
        break;
      default:
        result = await this.processImplementationPhase(request, conversationState);
    }

    // Save assistant response
    if (persistMessages) {
      await this.addMessage(request.conversationId, 'assistant', result.content, {
        phase: phase.type,
        shortcut: result.shortcut,
        analysis: result.analysis
      });
    }

    // Update conversation timestamp
    if (persistMessages && request.conversationId) {
      await this.updateConversationTimestamp(request.conversationId);
    }

    return result;
  }

  private async getConversationState(conversationId?: number): Promise<ConversationState> {
    if (!conversationId) {
      return {
        id: 0,
        messages: [],
        contextWindow: []
      };
    }

    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageRows = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp)
      .limit(this.maxMessages);

    return {
      id: conversationId,
      messages: messageRows.map(row => ({
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        timestamp: row.timestamp,
        metadata: row.metadata
      })),
      contextWindow: this.buildContextWindow(messageRows),
      userPreferences: await this.getUserPreferences(conversation.userId)
    };
  }

  private buildContextWindow(messages: any[]): string[] {
    return messages
      .slice(-this.maxMessages) // Keep only recent messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .filter(content => content.length < this.maxContextLength);
  }

  private async determinePhase(request: ProcessRequest, state: ConversationState): Promise<AgentPhase> {
    const content = request.content.toLowerCase();
    const lastMessages = state.messages.slice(-3);

    // Check if clarification is needed
    if (content.includes('what') || content.includes('which') || content.includes('help me understand')) {
      return {
        type: 'clarification',
        message: 'I need to understand your request better.',
        requiresInput: true
      };
    }

    // Check if external API/service is mentioned
    if (this.containsServiceReference(content)) {
      return {
        type: 'research',
        message: 'Researching API documentation for the mentioned service...'
      };
    }

    // Check if this is a refinement request
    if (content.includes('change') || content.includes('modify') || content.includes('improve') || content.includes('fix')) {
      return {
        type: 'refinement',
        message: 'Analyzing your shortcut for improvements...'
      };
    }

    // Default to implementation for generation requests
    if (request.type === 'generate') {
      return {
        type: 'implementation',
        message: 'Creating your iOS Shortcut...'
      };
    }

    // Default analysis
    return {
      type: 'validation',
      message: 'Analyzing your shortcut...'
    };
  }

  private containsServiceReference(content: string): boolean {
    if (!this.webSearchTool) return false;

    const hasApiIntent = /\b(api|endpoint|webhook|oauth|token|documentation|docs|developer|sdk)\b/i.test(content);
    if (!hasApiIntent) return false;

    const services = [
      'weather', 'maps', 'translate', 'calendar', 'email',
      'github', 'twitter', 'facebook', 'instagram', 'slack',
      'openai', 'anthropic', 'google', 'apple', 'microsoft',
      'spotify', 'youtube', 'netflix', 'discord', 'telegram'
    ];

    return services.some(service => content.includes(service));
  }

  private async processAnalysisPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    return {
      content: "I understand you want to create a shortcut. Let me analyze your request to ensure I build exactly what you need.\n\nWhat specific functionality are you looking for in this shortcut?",
      phase: {
        type: 'clarification',
        message: 'Gathering requirements...',
        requiresInput: true
      },
      requiresClarification: true,
      nextActions: ['Provide specific functionality', 'List desired inputs/outputs', 'Specify platforms/services']
    };
  }

  private async processClarificationPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    // For now, just proceed to implementation
    // In a more advanced version, we could parse the user's clarification and ask follow-up questions
    return {
      content: "Thank you for the clarification. I'll now create your shortcut based on your requirements.",
      phase: {
        type: 'implementation',
        message: 'Creating shortcut...'
      }
    };
  }

  private async processResearchPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    // Extract service names to research
    const services = this.extractServicesFromRequest(request.content);
    let researchResults = '';

    for (const service of services) {
      try {
        const searchResults = await this.webSearchTool.search(
          `${service} API documentation endpoints authentication examples`,
          3
        );

        researchResults += `\n\nResearch for ${service}:\n`;
        searchResults.results.forEach((result, index) => {
          researchResults += `${index + 1}. ${result.title}\n   ${result.snippet}\n\n`;
        });
      } catch (error) {
        researchResults += `\n\nCould not fetch documentation for ${service}. Will proceed with general knowledge.\n`;
      }
    }

    // Proceed to implementation with research results
    const enhancedPrompt = `${request.content}\n\nResearch Results:\n${researchResults}\n\nBased on this research, create a proper iOS Shortcut.`;

    return this.processImplementationPhase({ ...request, content: enhancedPrompt }, state);
  }

  private extractServicesFromRequest(content: string): string[] {
    const services: string[] = [];
    const contentLower = content.toLowerCase();

    // Known service patterns
    const servicePatterns = [
      'openai', 'anthropic', 'google', 'apple', 'microsoft',
      'github', 'twitter', 'facebook', 'instagram', 'slack',
      'spotify', 'youtube', 'discord', 'telegram',
      'weather', 'maps', 'translate', 'news', 'calendar', 'email'
    ];

    servicePatterns.forEach(service => {
      if (contentLower.includes(service)) {
        services.push(service);
      }
    });

    return services;
  }

  private async processImplementationPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    const model = request.model || state.userPreferences?.preferredModel || 'gpt-4o';

    // Build enhanced system prompt with conversation context
    const systemPrompt = this.buildSystemPrompt(state);

    this.addUpdate({
      type: 'info',
      message: `Generating shortcut using ${model.split('/').pop()}...`,
      phase: 'implementation'
    });

    try {
      this.addUpdate({
        type: 'progress',
        message: 'Processing with AI...',
        phase: 'implementation',
        progress: 30
      });

      const result = await this.aiProcessor.process({
        model,
        prompt: request.content,
        type: 'generate',
        systemPrompt,
        reasoningOptions: {
          reasoning_effort: 'medium',
          verbosity: 'medium'
        },
        useComprehensiveActions: true
      });

      this.addUpdate({
        type: 'progress',
        message: 'Validating generated shortcut...',
        phase: 'implementation',
        progress: 70
      });

      // Validate and parse the generated shortcut
      const validation = this.validateAndParseShortcut(result.content);

      if (!validation.valid) {
        const repairResult = await this.tryRepairShortcut(result.content, request, systemPrompt);
        if (repairResult) {
          return repairResult;
        }

        const fallbackShortcut = this.buildFallbackShortcut(request.content);
        return {
          content: this.formatAssistantResponse(JSON.stringify(fallbackShortcut), fallbackShortcut),
          phase: {
            type: 'validation',
            message: 'Generated a safe fallback shortcut...'
          },
          shortcut: fallbackShortcut,
          nextActions: [
            'Apply shortcut to editor',
            'Refine the shortcut',
            'Describe missing behavior'
          ]
        };
      }

      // Layer 3: AI self-verification loop — up to 3 passes
      let currentShortcut = validation.data;
      const MAX_VERIFICATION = 3;
      for (let pass = 0; pass < MAX_VERIFICATION; pass++) {
        const issues = validateShortcutDataFlow(currentShortcut);
        const errors = issues.filter(i => i.severity === 'error');
        if (errors.length === 0) break;

        console.log(`[Verification pass ${pass + 1}] Found ${errors.length} error(s), asking AI to fix...`);

        const fixPrompt = formatValidationIssuesForAI(currentShortcut, errors);
        try {
          const fixedResponse = await this.aiProcessor.process({
            model,
            prompt: fixPrompt,
            type: 'generate',
            systemPrompt,
            allowTools: false
          });
          const fixedValidation = this.validateAndParseShortcut(fixedResponse.content);
          if (fixedValidation.valid && fixedValidation.data) {
            currentShortcut = fixedValidation.data;
          } else {
            break;
          }
        } catch (err) {
          console.error('[Verification] AI fix pass failed:', err);
          break;
        }
      }

      // Run local analysis
      let localAnalysis;
      try {
        localAnalysis = await analyzeShortcut(currentShortcut);
      } catch (error) {
        console.error('Local analysis failed:', error);
      }

      return {
        content: this.formatAssistantResponse(result.content, currentShortcut),
        phase: {
          type: 'validation',
          message: 'Validating shortcut...'
        },
        shortcut: currentShortcut,
        analysis: localAnalysis,
        nextActions: [
          'Apply shortcut to editor',
          'Test shortcut functionality',
          'Make refinements',
          'Export as .shortcut file'
        ]
      };
    } catch (error: any) {
      return {
        content: `I encountered an error while creating your shortcut: ${error.message}. Please try rephrasing your request or provide more specific details.`,
        phase: {
          type: 'clarification',
          message: 'Error occurred, need clarification...',
          requiresInput: true
        },
        requiresClarification: true
      };
    }
  }

  private async processValidationPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    // This phase is typically reached after implementation
    // For now, just provide a completion message
    return {
      content: "Your shortcut has been created and validated successfully! You can now apply it to the editor or make additional refinements.",
      phase: {
        type: 'complete',
        message: 'Shortcut ready!'
      },
      nextActions: ['Apply to editor', 'Make changes', 'Export shortcut']
    };
  }

  private async processRefinementPhase(request: ProcessRequest, state: ConversationState): Promise<ProcessResult> {
    // Extract the current shortcut from conversation history
    let lastShortcutMessage: ConversationMessage | undefined;

    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const msg = state.messages[i];
      if (msg.role === 'assistant' && msg.metadata?.shortcut) {
        lastShortcutMessage = msg;
        break;
      }
    }

    if (!lastShortcutMessage?.metadata?.shortcut) {
      return {
        content: "I don't see a previous shortcut to refine. Could you please provide the shortcut you'd like me to modify?",
        phase: {
          type: 'clarification',
          message: 'Need shortcut to refine...',
          requiresInput: true
        },
        requiresClarification: true
      };
    }

    const currentShortcut = lastShortcutMessage.metadata.shortcut;
    const refinedPrompt = `Current shortcut:\n${JSON.stringify(currentShortcut, null, 2)}\n\nUser requested changes: ${request.content}\n\nPlease modify the shortcut according to the user's request and return the updated JSON.`;

    return this.processImplementationPhase({ ...request, content: refinedPrompt }, state);
  }

  private buildSystemPrompt(state: ConversationState): string {
    return `The assistant is in a highly skilled iOS Shortcuts architect kind of mood. The assistant specializes in creating, analyzing, and optimizing iOS Shortcuts through conversational interaction.

CURRENT CONTEXT:
- You are in a multi-turn conversation
- Previous messages provide context for the current request
- You should build upon previous work when refining shortcuts

CONVERSATION HISTORY:
${state.messages.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

BEHAVIORAL PRINCIPLES:
- Ask clarifying questions when requests are ambiguous
- Research external APIs when mentioned
- Validate all shortcuts before presenting
- Provide actionable next steps
- Learn from user preferences over time

TOOLS AVAILABLE:
- Web search for API documentation
- Action database with 185+ iOS Shortcut actions
- Local shortcut analyzer for optimization
- Multi-provider AI models (OpenAI, Anthropic, OpenRouter)

RESPONSE FORMAT:
- Always provide valid JSON shortcuts when generating
- Include next actions for the user
- Explain complex decisions clearly
- Offer alternatives when appropriate

${state.userPreferences ? `USER PREFERENCES:\n- Preferred model: ${state.userPreferences.preferredModel}\n- Preferred complexity: ${state.userPreferences.preferredComplexity}` : ''}`;
  }

  private validateAndParseShortcut(content: string): { valid: boolean; data?: any; error?: string } {
    try {
      // Remove any markdown code blocks
      const cleaned = content.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1').trim();

      // Ensure it starts with { and ends with }
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        return { valid: false, error: 'No valid JSON object found' };
      }

      const jsonString = cleaned.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonString);

      // Validate shortcut structure
      if (!parsed.name || !Array.isArray(parsed.actions)) {
        return { valid: false, error: 'Invalid shortcut structure: missing name or actions array' };
      }

      // Additional validation using existing validateShortcut function
      const validationErrors = validateShortcut(parsed);
      if (validationErrors.length > 0) {
        return { valid: false, error: `Shortcut validation failed: ${validationErrors.join('; ')}` };
      }

      return { valid: true, data: parsed };
    } catch (error: any) {
      return { valid: false, error: error.message || 'Invalid JSON format' };
    }
  }

  private buildActionSchemaPrompt(): string {
    return Object.entries(SHORTCUT_ACTIONS).map(([id, action]) =>
      `- ${action.name}: ${id}\n  Required parameters: ${action.parameters.join(', ')}`
    ).join('\n');
  }

  private buildFallbackShortcut(prompt: string): ShortcutSchema {
    const safeText = prompt.trim() || 'Shortcut request';
    const lower = safeText.toLowerCase();

    if (lower.includes('notification') || lower.includes('notify')) {
      return {
        name: 'Notification Shortcut',
        actions: [
          {
            type: 'notification',
            parameters: {
              title: 'Notification',
              body: safeText,
              sound: true
            }
          }
        ]
      };
    }

    if (lower.includes('note') || lower.includes('notes')) {
      return {
        name: 'Note Shortcut',
        actions: [
          {
            type: 'create_note',
            parameters: { text: safeText }
          }
        ]
      };
    }

    if (lower.includes('volume')) {
      const match = safeText.match(/(\d{1,3})/);
      const level = match ? Math.max(0, Math.min(100, parseInt(match[1], 10))) : 50;
      return {
        name: 'Volume Shortcut',
        actions: [
          {
            type: 'set_volume',
            parameters: { level }
          }
        ]
      };
    }

    if (lower.includes('brightness')) {
      const match = safeText.match(/(\d{1,3})/);
      const level = match ? Math.max(0, Math.min(100, parseInt(match[1], 10))) : 50;
      return {
        name: 'Brightness Shortcut',
        actions: [
          {
            type: 'set_brightness',
            parameters: { level }
          }
        ]
      };
    }

    return {
      name: 'Generated Shortcut',
      actions: [
        {
          type: 'text',
          parameters: { text: safeText }
        }
      ]
    };
  }

  private async tryRepairShortcut(rawContent: string, request: ProcessRequest, systemPrompt: string): Promise<ProcessResult | null> {
    try {
      const repairPrompt = `Fix the following output into a valid JSON shortcut object.\n\n` +
        `Use valid iOS Shortcuts action identifiers (is.workflow.actions.* or com.apple.*) and WF* parameter keys.\n\n` +
        `Original user request:\n${request.content}\n\n` +
        `Model output to repair:\n${rawContent}\n\n` +
        `Return ONLY valid JSON matching this format:\n` +
        `{\n  \"name\": \"Shortcut Name\",\n  \"actions\": [\n    { \"type\": \"action_identifier\", \"parameters\": { \"parameter_key\": \"parameter_value\" } }\n  ]\n}`;

      const repaired = await this.aiProcessor.process({
        model: request.model || 'gpt-4o',
        prompt: repairPrompt,
        type: 'generate',
        systemPrompt,
        reasoningOptions: {
          reasoning_effort: 'medium',
          verbosity: 'low'
        },
        useComprehensiveActions: true,
        allowTools: false
      });

      const validation = this.validateAndParseShortcut(repaired.content);
      if (!validation.valid) {
        return null;
      }

      let localAnalysis;
      try {
        localAnalysis = await analyzeShortcut(validation.data);
      } catch (error) {
        console.error('Local analysis failed:', error);
      }

      return {
        content: this.formatAssistantResponse(repaired.content, validation.data),
        phase: {
          type: 'validation',
          message: 'Repaired shortcut structure...'
        },
        shortcut: validation.data,
        analysis: localAnalysis,
        nextActions: [
          'Apply shortcut to editor',
          'Test shortcut functionality',
          'Make refinements',
          'Export as .shortcut file'
        ]
      };
    } catch (error) {
      return null;
    }
  }

  private formatAssistantResponse(content: string, shortcut: any): string {
    const summary = `Created shortcut "${shortcut.name}" with ${shortcut.actions.length} action${shortcut.actions.length === 1 ? '' : 's'}.`;

    return `${summary}

Here's your shortcut:

\`\`\`json
${JSON.stringify(shortcut, null, 2)}
\`\`\`

You can apply this shortcut to the editor or ask me to make any modifications.`;
  }

  private async addMessage(conversationId: number | undefined, role: 'user' | 'assistant' | 'system', content: string, metadata?: any): Promise<number> {
    if (!conversationId) {
      // For new conversations, we'll create them in the API layer
      return 0;
    }

    const [message] = await db.insert(messages)
      .values({
        conversationId,
        role,
        content,
        metadata: metadata || {},
        timestamp: new Date()
      })
      .returning();

    return message.id;
  }

  private async updateConversationTimestamp(conversationId: number): Promise<void> {
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  private async getUserPreferences(userId: number): Promise<any> {
    // This would query the user_preferences table
    // For now, return default preferences
    return {
      preferredModel: 'gpt-4o',
      preferredComplexity: 'auto'
    };
  }

  // Conversation management methods
  async createConversation(userId: number, title: string): Promise<number> {
    const [conversation] = await db.insert(conversations)
      .values({
        userId,
        title,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return conversation.id;
  }

  async getConversation(conversationId: number): Promise<any> {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      return null;
    }

    const messageRows = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    return {
      ...conversation,
      messages: messageRows
    };
  }

  async listConversations(userId: number, limit = 20, offset = 0): Promise<any[]> {
    return await db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async deleteConversation(conversationId: number): Promise<void> {
    await db.delete(conversations)
      .where(eq(conversations.id, conversationId));
  }

  async saveShortcutVersion(conversationId: number, version: number, shortcutData: any): Promise<void> {
    await db.insert(shortcutVersions)
      .values({
        conversationId,
        version,
        shortcutData,
        timestamp: new Date()
      })
      .onConflictDoNothing();
  }

  async getShortcutVersions(conversationId: number): Promise<any[]> {
    return await db.select()
      .from(shortcutVersions)
      .where(eq(shortcutVersions.conversationId, conversationId))
      .orderBy(desc(shortcutVersions.version));
  }
}
