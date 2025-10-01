interface ModelCapabilities {
  speed: number;        // 1-10 scale
  accuracy: number;     // 1-10 scale
  complexity: number;   // max complexity it can handle (1-10)
  costPerToken: number; // relative cost
  maxTokens: number;    // token limit
}

interface TaskProfile {
  complexity: number;   // estimated task complexity
  urgency: number;      // how quickly result is needed
  accuracy: number;     // required accuracy level
  tokenEstimate: number; // estimated tokens needed
}

const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'gpt-4o': {
    speed: 8,
    accuracy: 9,
    complexity: 9,
    costPerToken: 1.0, // baseline
    maxTokens: 128000
  },
  'claude-3-5-sonnet-20241022': {
    speed: 7,
    accuracy: 10,
    complexity: 10,
    costPerToken: 0.8, // slightly cheaper
    maxTokens: 200000
  }
};

class ModelRouter {
  private performanceHistory = new Map<string, { avgResponseTime: number; successRate: number; requests: number }>();

  analyzeTask(prompt: string, type: 'generate' | 'analyze'): TaskProfile {
    // Analyze prompt complexity
    const wordCount = prompt.split(/\s+/).length;
    const complexity = this.calculateComplexity(prompt, type);
    
    // Estimate token usage
    const tokenEstimate = Math.ceil(wordCount * 1.3); // rough estimation
    
    return {
      complexity,
      urgency: type === 'generate' ? 7 : 5, // generation is typically more urgent
      accuracy: type === 'analyze' ? 9 : 7,  // analysis needs higher accuracy
      tokenEstimate
    };
  }

  private calculateComplexity(prompt: string, type: 'generate' | 'analyze'): number {
    let complexity = 1;
    
    // Base complexity by type
    complexity += type === 'analyze' ? 3 : 2;
    
    // Word count factor
    const wordCount = prompt.split(/\s+/).length;
    complexity += Math.min(Math.floor(wordCount / 50), 4);
    
    // Complexity indicators
    const complexityKeywords = [
      'complex', 'advanced', 'multiple', 'conditional', 'nested',
      'automation', 'workflow', 'integration', 'security'
    ];
    
    const foundKeywords = complexityKeywords.filter(keyword =>
      prompt.toLowerCase().includes(keyword)
    ).length;
    
    complexity += Math.min(foundKeywords, 3);
    
    // JSON structure complexity (for analysis)
    if (type === 'analyze') {
      try {
        const parsed = JSON.parse(prompt);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          complexity += Math.min(parsed.actions.length / 3, 2);
          
          // Check for complex action types
          const complexActions = ['if', 'repeat', 'variable', 'conditional'];
          const hasComplexActions = parsed.actions.some((action: any) =>
            complexActions.includes(action.type)
          );
          
          if (hasComplexActions) complexity += 2;
        }
      } catch {
        // If JSON parsing fails, assume moderate complexity
        complexity += 1;
      }
    }
    
    return Math.min(complexity, 10);
  }

  selectOptimalModel(taskProfile: TaskProfile, availableModels: string[]): {
    model: string;
    confidence: number;
    reasoning: string;
  } {
    let bestModel = availableModels[0];
    let bestScore = -1;
    let reasoning = '';

    for (const model of availableModels) {
      const capabilities = MODEL_CAPABILITIES[model];
      if (!capabilities) continue;

      const performance = this.performanceHistory.get(model) || {
        avgResponseTime: 1000,
        successRate: 0.95,
        requests: 0
      };

      // Calculate score based on task requirements
      let score = 0;
      
      // Complexity handling
      if (capabilities.complexity >= taskProfile.complexity) {
        score += 30;
      } else {
        score -= (taskProfile.complexity - capabilities.complexity) * 10;
      }
      
      // Speed requirement
      if (taskProfile.urgency > 7) {
        score += capabilities.speed * 2;
      } else {
        score += capabilities.speed;
      }
      
      // Accuracy requirement
      if (taskProfile.accuracy > 8) {
        score += capabilities.accuracy * 3;
      } else {
        score += capabilities.accuracy * 2;
      }
      
      // Cost efficiency
      score += (2.0 - capabilities.costPerToken) * 10;
      
      // Historical performance
      score += performance.successRate * 20;
      score -= Math.min(performance.avgResponseTime / 100, 10);
      
      // Token limit check
      if (taskProfile.tokenEstimate > capabilities.maxTokens) {
        score -= 50; // Heavy penalty for exceeding limits
      }

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
        reasoning = this.generateReasoning(model, capabilities, taskProfile, performance);
      }
    }

    const confidence = Math.min(Math.max(bestScore / 100, 0.1), 1.0);
    
    return {
      model: bestModel,
      confidence,
      reasoning
    };
  }

  private generateReasoning(
    model: string,
    capabilities: ModelCapabilities,
    task: TaskProfile,
    performance: { avgResponseTime: number; successRate: number; requests: number }
  ): string {
    const reasons = [];

    if (capabilities.complexity >= task.complexity) {
      reasons.push(`handles complexity level ${task.complexity}`);
    }

    if (task.urgency > 7 && capabilities.speed > 7) {
      reasons.push('fast response time needed');
    }

    if (task.accuracy > 8 && capabilities.accuracy > 8) {
      reasons.push('high accuracy requirement');
    }

    if (capabilities.costPerToken < 1.0) {
      reasons.push('cost-effective');
    }

    if (performance.successRate > 0.9) {
      reasons.push(`${Math.round(performance.successRate * 100)}% success rate`);
    }

    return `Selected ${model}: ${reasons.join(', ')}`;
  }

  updatePerformance(model: string, responseTime: number, success: boolean): void {
    const current = this.performanceHistory.get(model) || {
      avgResponseTime: responseTime,
      successRate: success ? 1 : 0,
      requests: 0
    };

    const requests = current.requests + 1;
    const avgResponseTime = (current.avgResponseTime * current.requests + responseTime) / requests;
    const successRate = (current.successRate * current.requests + (success ? 1 : 0)) / requests;

    this.performanceHistory.set(model, {
      avgResponseTime,
      successRate,
      requests
    });

    console.log(`Updated performance for ${model}: ${Math.round(avgResponseTime)}ms avg, ${Math.round(successRate * 100)}% success`);
  }

  getModelStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [model, performance] of this.performanceHistory.entries()) {
      stats[model] = {
        ...performance,
        avgResponseTime: Math.round(performance.avgResponseTime),
        successRate: Math.round(performance.successRate * 100) / 100
      };
    }
    
    return stats;
  }

  // Override for manual model selection
  routeModel(prompt: string, type: 'generate' | 'analyze', userSelectedModel?: string): {
    model: string;
    confidence: number;
    reasoning: string;
    wasOverridden: boolean;
  } {
    const taskProfile = this.analyzeTask(prompt, type);
    const availableModels = Object.keys(MODEL_CAPABILITIES);

    // If user selected a model, check if we should honor their choice
    if (userSelectedModel) {
      // Always honor OpenRouter model selections
      if (userSelectedModel.includes('/') || userSelectedModel.startsWith('openrouter/')) {
        return {
          model: userSelectedModel,
          confidence: 1.0,
          reasoning: `User-selected OpenRouter model: ${userSelectedModel}`,
          wasOverridden: true
        };
      }

      // Honor other direct model selections if they're in our capabilities
      if (availableModels.includes(userSelectedModel)) {
        return {
          model: userSelectedModel,
          confidence: 1.0,
          reasoning: `User-selected model: ${userSelectedModel}`,
          wasOverridden: true
        };
      }
    }

    const optimal = this.selectOptimalModel(taskProfile, availableModels);

    return {
      ...optimal,
      wasOverridden: false
    };
  }
}

// Singleton router instance
export const modelRouter = new ModelRouter();