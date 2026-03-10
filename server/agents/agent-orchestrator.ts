import { AgentResult, OrchestrationResult, OrchestrationStrategy } from './base/agent-types';
import { AgentLogger } from './base/agent-logger';
import { IOSResearchAgent } from './ios-research-agent';
import { ShortcutValidatorAgent } from './shortcut-validator-agent';
import { SecurityAnalyzerAgent } from './security-analyzer-agent';
import { OptimizationAgent } from './optimization-agent';
import { DocumentationAgent } from './documentation-agent';
import { getFinalActionDatabasePath } from '../runtime-config';

export interface OrchestratorConfig {
  timeout?: number;
  parallelLimit?: number;
  failurePolicy?: 'continue' | 'stop' | 'retry';
}

interface AgentTask {
  id: string;
  agentType: 'ios-research' | 'shortcut-validator' | 'security-analyzer' | 'optimizer' | 'documentation';
  input: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  timeout?: number;
  retries?: number;
  metadata?: any;
}

export interface AgentTaskResult {
  taskId: string;
  agentType: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  metadata?: any;
}

export class AgentOrchestrator {
  private agents: Map<string, any>;
  private config: OrchestratorConfig;
  private logger: AgentLogger;
  private metrics: Map<string, any>;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      timeout: 30000,
      parallelLimit: 5,
      failurePolicy: 'continue',
      ...config
    };
    this.logger = AgentLogger.getInstance();
    this.metrics = new Map();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.logger.info(this.getAgentName(), 'Initializing specialized agents');

    // Note: In a real implementation, we would inject the required dependencies
    // For now, we'll create placeholder instances
    this.agents.set('ios-research', new IOSResearchAgent({
      webSearchTool: {} as any, // Would inject actual WebSearchTool
      actionDatabasePath: getFinalActionDatabasePath()
    }));

    this.agents.set('shortcut-validator', new ShortcutValidatorAgent({
      enableLocalAnalysis: true
    }));

    this.agents.set('security-analyzer', new SecurityAnalyzerAgent());

    this.agents.set('optimizer', new OptimizationAgent());

    this.agents.set('documentation', new DocumentationAgent({
      enableExamples: true,
      enableTroubleshooting: true
    }));

    this.logger.info(this.getAgentName(), `Initialized ${this.agents.size} specialized agents`);
  }

  getAgent(agentType: string): any {
    return this.agents.get(agentType);
  }

  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  async executeTask(task: AgentTask): Promise<AgentTaskResult> {
    const startTime = Date.now();
    this.logger.info(this.getAgentName(), `Executing task: ${task.id} (${task.agentType})`);

    try {
      const agent = this.getAgent(task.agentType);
      if (!agent) {
        throw new Error(`Agent ${task.agentType} not found`);
      }

      // Configure agent for this specific task
      const agentConfig = {
        timeout: task.timeout || this.config.timeout,
        maxRetries: task.retries || 0
      };

      // Create a temporary agent instance with custom config
      const customAgent = Object.create(agent.constructor);
      Object.assign(customAgent, agentConfig);

      // Execute the task
      const result = await customAgent.execute(task.input);

      const executionTime = Date.now() - startTime;
      this.metrics.set(task.id, {
        executionTime,
        success: result.success,
        retries: task.retries || 0
      });

      const taskResult: AgentTaskResult = {
        taskId: task.id,
        agentType: task.agentType,
        success: result.success,
        result: result.data,
        error: result.error ? result.error.message : undefined,
        executionTime,
        metadata: {
          ...task.metadata,
          agent: agentConfig
        }
      };

      this.logger.info(this.getAgentName(), `Task ${task.id} completed in ${executionTime}ms (success: ${taskResult.success})`);

      return taskResult;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.logger.error(this.getAgentName(), `Task ${task.id} failed: ${error.message}`, {
        taskId: task.id,
        error: error.message
      });

      return {
        taskId: task.id,
        agentType: task.agentType,
        success: false,
        error: error.message,
        executionTime,
        metadata: task.metadata
      };
    }
  }

  async executeStrategy(strategy: OrchestrationStrategy, initialTask?: AgentTask): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.logger.info(this.getAgentName(), `Executing orchestration strategy: ${strategy.mode}`);

    const tasks: AgentTask[] = [];
    const dependencies = new Map<string, AgentTaskResult>();

    // Build task list based on strategy
    if (strategy.mode === 'parallel') {
      // Create independent tasks for parallel execution
      strategy.agents.forEach(agentType => {
        tasks.push({
          id: `${Date.now()}-${agentType}`,
          agentType,
          input: initialTask?.input,
          priority: 'high',
          timeout: strategy.timeout,
          retries: strategy.maxRetries
        });
      });
    } else if (strategy.mode === 'sequential') {
      // Create tasks for sequential execution
      let previousResult: AgentTaskResult | undefined;

      strategy.agents.forEach(agentType => {
        const task: AgentTask = {
          id: `${Date.now()}-${agentType}`,
          agentType,
          input: initialTask?.input,
          priority: 'high',
          timeout: strategy.timeout,
          retries: strategy.maxRetries,
          dependencies: previousResult ? [previousResult.taskId] : []
        };

        if (previousResult) {
          dependencies.set(previousResult.taskId, previousResult);
        }

        tasks.push(task);
        previousResult = undefined; // Will be set after execution
      });
    } else if (strategy.mode === 'conditional') {
      // Conditional execution based on conditions
      strategy.agents.forEach(agentType => {
        const shouldExecute = strategy.conditions?.every(condition =>
          this.evaluateCondition(condition, initialTask?.input)
        );

        if (shouldExecute) {
          tasks.push({
            id: `${Date.now()}-${agentType}`,
            agentType,
            input: initialTask?.input,
            priority: 'medium',
            timeout: strategy.timeout,
            retries: strategy.maxRetries
          });
        }
      });

    this.logger.info(this.getAgentName(), `Created ${tasks.length} tasks for ${strategy.mode} execution`);

    const results: AgentTaskResult[] = [];
    let totalExecutionTime = 0;

    // Execute tasks based on strategy
    if (strategy.mode === 'parallel') {
      // Execute all tasks in parallel
      const promises = tasks.map(task => this.executeTask(task));
      const parallelResults = await Promise.allSettled(promises);
      results.push(...parallelResults);
      totalExecutionTime = Math.max(...parallelResults.map(r => r.executionTime));
    } else {
      // Execute tasks sequentially
      for (const task of tasks) {
        const result = await this.executeTask(task);
        results.push(result);
        totalExecutionTime += result.executionTime;
        totalExecutionTime += result.executionTime;

        // Check if we should continue
        if (result.success === false && strategy.failurePolicy === 'stop') {
          break;
        }
      }
    }

    // Aggregate results based on aggregation method
    let aggregatedResult: any;
    const allSuccessful = results.every(r => r.success);

    if (strategy.aggregationMethod === 'all') {
      aggregatedResult = results.map(r => r.result).filter(r => r.success);
    } else if (strategy.aggregationMethod === 'select-best') {
      const successfulResults = results.filter(r => r.success);
      aggregatedResult = this.selectBestResult(successfulResults);
    } else if (strategy.aggregationMethod === 'merge') {
      aggregatedResult = this.mergeResults(results.filter(r => r.success));
    } else {
      // Default to first successful result
      const firstSuccess = results.find(r => r.success);
      aggregatedResult = firstSuccess ? [firstSuccess.result] : [];
    }

    const success = allSuccessful && !results.some(r => r.error);
    const executionTime = totalExecutionTime;

    const orchestrationResult: OrchestrationResult = {
      strategy,
      results,
      success,
      aggregatedResult,
      allSuccessful,
      totalExecutionTime
    };

    this.logger.info(this.getAgentName(), `Orchestration completed in ${executionTime}ms (success: ${success})`);

    return orchestrationResult;
  }

  private selectBestResult(results: AgentTaskResult[]): any[] {
    if (results.length === 0) return [];

    // Select based on execution time and confidence
    let bestResult = results[0];

    results.forEach(result => {
      if (result.success && result.executionTime < bestResult.executionTime) {
        bestResult = result;
      }
    });

    return [bestResult];
  }

  private mergeResults(results: AgentTaskResult[]): any[] {
    if (results.length === 0) return [];

    // Merge results by type
    const mergedByType = new Map<string, any>();

    results.forEach(result => {
      const type = result.agentType;
      if (!mergedByType.has(type)) {
        mergedByType.set(type, []);
      }
      mergedByType.get(type).push(result.result);
    });

    return Array.from(mergedByType.values()).flat();
  }

  private evaluateCondition(condition: string, input: any): boolean {
    // Simple condition evaluation for now
    try {
      // This would parse and evaluate the condition
      return false; // Implement actual condition evaluation
    } catch (error) {
      return false;
    }
  }

  getMetrics(): any {
    const agentStats: any = {};

    this.agents.forEach((agent, name) => {
      agentStats[name] = agent.getStats();
    });

    return {
      agents: agentStats,
      orchestrator: {
        totalTasks: this.metrics.size,
        cacheSize: 0,
        averageExecutionTime: this.calculateAverageExecutionTime(),
        cacheHitRate: 0.0
      }
    };
  }

  private calculateAverageExecutionTime(): number {
    const times = Array.from(this.metrics.values()).map(m => m.executionTime);
    return times.length > 0 ? times.reduce((a, b) => a + b) / times.length : 0;
  }

  clearCache(): void {
    this.agents.forEach(agent => agent.clearCache());
  }

  async testAgent(agentType: string, testInput: any): Promise<boolean> {
    const agent = this.getAgent(agentType);
    if (!agent) {
      return false;
    }

    try {
      const testResult = await agent.execute(testInput);
      return testResult.success;
    } catch (error) {
      this.logger.warn(this.getAgentName(), `Agent test failed for ${agentType}: ${error.message}`);
      return false;
    }
  }
}
