import crypto from 'crypto';

interface CacheEntry {
  content: string;
  localAnalysis?: any;
  timestamp: number;
  model: string;
  type: string;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_SIZE = 1000; // Maximum cache entries

  constructor() {
    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private generateKey(model: string, prompt: string, type: string): string {
    const content = `${model}:${type}:${prompt}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    console.log(`Cache cleanup: removed ${removedCount} expired entries`);
    
    // If still over limit, remove oldest entries
    if (this.cache.size > this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
      
      console.log(`Cache cleanup: removed ${toRemove.length} oldest entries`);
    }
  }

  get(model: string, prompt: string, type: string): CacheEntry | null {
    const key = this.generateKey(model, prompt, type);
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }
    
    return entry;
  }

  set(model: string, prompt: string, type: string, content: string, localAnalysis?: any): void {
    const key = this.generateKey(model, prompt, type);
    const entry: CacheEntry = {
      content,
      localAnalysis,
      timestamp: Date.now(),
      model,
      type
    };
    
    this.cache.set(key, entry);
    
    // Immediate cleanup if over limit
    if (this.cache.size > this.MAX_SIZE) {
      this.cleanup();
    }
  }

  // For similar prompts - semantic similarity caching
  findSimilar(model: string, prompt: string, type: string, threshold: number = 0.8): CacheEntry | null {
    const promptWords = prompt.toLowerCase().split(/\s+/);
    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.model !== model || entry.type !== type || this.isExpired(entry)) {
        continue;
      }
      
      // Simple word-based similarity
      const entryKey = key.slice(0, 64); // First part contains model:type info
      const similarity = this.calculateSimilarity(prompt, entryKey);
      
      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { entry, similarity };
      }
    }
    
    return bestMatch?.entry || null;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  getStats(): { size: number; hitRate: number; oldestEntry: number } {
    const now = Date.now();
    let oldestTimestamp = now;
    
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      oldestEntry: now - oldestTimestamp
    };
  }

  clear(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }
}

// Singleton cache instance
export const responseCache = new ResponseCache();