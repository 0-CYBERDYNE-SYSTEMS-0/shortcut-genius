/**
 * Base abstract class for all specialized agents
 */

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metrics: AgentMetrics;
  timestamp: Date;
}

export interface AgentError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

export interface AgentMetrics {
  executionTime: number;
  retryCount: number;
  cacheHit: boolean;
  tokenUsage?: number;
}

export interface AgentConfig {
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
}

export abstract class Agent<TInput, TOutput> {
  protected config: AgentConfig;
  protected cache: Map<string, any> = new Map();
  protected metrics: Map<string, number> = new Map();

  constructor(config: AgentConfig = {}) {
    this.config = {
      timeout: 30000, // 30 seconds default
      maxRetries: 3,
      enableCache: true,
      ...config
    };
  }

  abstract execute(input: TInput): Promise<AgentResult<TOutput>>;
  abstract validate(input: TInput): boolean;
  abstract getAgentName(): string;

  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number = this.config.timeout!
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Agent ${this.getAgentName()} timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries!
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  protected createResult(
    data: TOutput,
    executionTime: number,
    retryCount: number = 0,
    cacheHit: boolean = false
  ): AgentResult<TOutput> {
    return {
      success: true,
      data,
      metrics: {
        executionTime,
        retryCount,
        cacheHit,
        tokenUsage: this.metrics.get('tokenUsage')
      },
      timestamp: new Date()
    };
  }

  protected createError(
    error: Error,
    executionTime: number,
    retryCount: number = 0
  ): AgentResult<TOutput> {
    return {
      success: false,
      error: {
        code: error.constructor.name,
        message: error.message,
        stack: error.stack,
        recoverable: this.isRecoverableError(error)
      },
      metrics: {
        executionTime,
        retryCount,
        cacheHit: false
      },
      timestamp: new Date()
    };
  }

  protected isRecoverableError(error: Error): boolean {
    const recoverableErrors = [
      'NetworkError',
      'TimeoutError',
      'RateLimitError',
      'TemporaryFailure'
    ];

    return recoverableErrors.some(name => error.name.includes(name) || error.message.includes(name));
  }

  protected getCacheKey(input: TInput): string {
    return `${this.getAgentName()}_${JSON.stringify(input)}`;
  }

  protected async getCachedResult(cacheKey: string): Promise<TOutput | null> {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      this.metrics.set('cacheHits', (this.metrics.get('cacheHits') || 0) + 1);
      return cached.data;
    }

    return null;
  }

  protected setCachedResult(cacheKey: string, data: TOutput, ttl: number = 300000): void {
    if (!this.config.enableCache) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  protected isCacheExpired(cached: any): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.getAgentName()}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  public getStats(): any {
    return {
      agentName: this.getAgentName(),
      cacheSize: this.cache.size,
      cacheHits: this.metrics.get('cacheHits') || 0,
      tokenUsage: this.metrics.get('tokenUsage') || 0
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }
}