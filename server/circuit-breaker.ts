interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  requests: number;
  state: CircuitState;
  lastFailureTime: number;
  nextAttemptTime: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

class CircuitBreaker {
  private stats: CircuitBreakerStats;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,      // Open circuit after 5 failures
      recoveryTimeout: 60000,   // Wait 60s before retry
      monitoringPeriod: 300000, // 5 minute monitoring window
      ...config
    };

    this.stats = {
      failures: 0,
      successes: 0,
      requests: 0,
      state: CircuitState.CLOSED,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.stats.requests++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.stats.state === CircuitState.OPEN && Date.now() >= this.stats.nextAttemptTime) {
      this.stats.state = CircuitState.HALF_OPEN;
      console.log('Circuit breaker: Transitioning to HALF_OPEN');
    }

    // If circuit is OPEN, fail fast
    if (this.stats.state === CircuitState.OPEN) {
      const error = new Error('Circuit breaker is OPEN - service unavailable');
      if (fallback) {
        console.log('Circuit breaker: Using fallback');
        return await fallback();
      }
      throw error;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      // If we have a fallback and circuit is now OPEN, use it
      if (fallback && this.stats.state === CircuitState.OPEN) {
        console.log('Circuit breaker: Using fallback after failure');
        return await fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.stats.successes++;
    
    // If we were in HALF_OPEN and succeeded, close the circuit
    if (this.stats.state === CircuitState.HALF_OPEN) {
      this.stats.state = CircuitState.CLOSED;
      this.stats.failures = 0; // Reset failure count
      console.log('Circuit breaker: Service recovered, transitioning to CLOSED');
    }
  }

  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    // If we've hit the failure threshold, open the circuit
    if (this.stats.failures >= this.config.failureThreshold) {
      this.stats.state = CircuitState.OPEN;
      this.stats.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      console.log(`Circuit breaker: Opening circuit due to ${this.stats.failures} failures`);
    }
  }

  getStats(): CircuitBreakerStats & { failureRate: number } {
    const failureRate = this.stats.requests === 0 ? 0 : this.stats.failures / this.stats.requests;
    return {
      ...this.stats,
      failureRate
    };
  }

  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      requests: 0,
      state: CircuitState.CLOSED,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
    console.log('Circuit breaker: Reset to initial state');
  }

  forceOpen(): void {
    this.stats.state = CircuitState.OPEN;
    this.stats.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    console.log('Circuit breaker: Forced to OPEN state');
  }

  forceClose(): void {
    this.stats.state = CircuitState.CLOSED;
    this.stats.failures = 0;
    console.log('Circuit breaker: Forced to CLOSED state');
  }
}

// Create circuit breakers for each AI service
export const openAICircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  monitoringPeriod: 180000 // 3 minutes
});

export const anthropicCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds  
  monitoringPeriod: 180000 // 3 minutes
});

export { CircuitBreaker, CircuitState };