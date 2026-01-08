/**
 * Centralized logging utility for all agents
 */

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

export interface LogEntry {
  timestamp: string;
  agentName: string;
  level: LogLevel;
  message: string;
  metadata?: any;
  executionTime?: number;
}

export class AgentLogger {
  private static instance: AgentLogger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private currentLogLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): AgentLogger {
    if (!AgentLogger.instance) {
      AgentLogger.instance = new AgentLogger();
    }
    return AgentLogger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public setMaxLogs(max: number): void {
    this.maxLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
    }
  }

  public log(
    agentName: string,
    level: LogLevel,
    message: string,
    metadata?: any,
    executionTime?: number
  ): void {
    if (level > this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      agentName,
      level,
      message,
      metadata,
      executionTime
    };

    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console
    this.outputToConsole(logEntry);
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timeStr = new Date(entry.timestamp).toLocaleTimeString();
    const execTime = entry.executionTime ? ` (${entry.executionTime}ms)` : '';

    let consoleMethod: 'log' | 'warn' | 'error' = 'log';
    let prefix = '';

    switch (entry.level) {
      case LogLevel.ERROR:
        consoleMethod = 'error';
        prefix = '🔴';
        break;
      case LogLevel.WARN:
        consoleMethod = 'warn';
        prefix = '🟡';
        break;
      case LogLevel.INFO:
        consoleMethod = 'log';
        prefix = '🔵';
        break;
      case LogLevel.DEBUG:
        consoleMethod = 'log';
        prefix = '🟢';
        break;
    }

    const message = `${prefix} [${timeStr}] [${entry.agentName}] ${entry.message}${execTime}`;

    if (entry.metadata) {
      console[consoleMethod](message, entry.metadata);
    } else {
      console[consoleMethod](message);
    }
  }

  public error(agentName: string, message: string, metadata?: any): void {
    this.log(agentName, LogLevel.ERROR, message, metadata);
  }

  public warn(agentName: string, message: string, metadata?: any): void {
    this.log(agentName, LogLevel.WARN, message, metadata);
  }

  public info(agentName: string, message: string, metadata?: any): void {
    this.log(agentName, LogLevel.INFO, message, metadata);
  }

  public debug(agentName: string, message: string, metadata?: any): void {
    this.log(agentName, LogLevel.DEBUG, message, metadata);
  }

  public performance(agentName: string, operation: string, executionTime: number): void {
    this.log(agentName, LogLevel.INFO, `Performance: ${operation}`, {
      operation,
      executionTime: `${executionTime}ms`
    }, executionTime);
  }

  public getLogs(agentName?: string, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (agentName) {
      filteredLogs = filteredLogs.filter(log => log.agentName === agentName);
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level <= level);
    }

    return filteredLogs;
  }

  public getRecentLogs(count: number = 100, agentName?: string): LogEntry[] {
    let logs = this.logs;

    if (agentName) {
      logs = logs.filter(log => log.agentName === agentName);
    }

    return logs.slice(-count);
  }

  public getErrorLogs(agentName?: string): LogEntry[] {
    return this.getLogs(agentName, LogLevel.ERROR);
  }

  public getPerformanceStats(agentName: string): {
    totalOperations: number;
    averageExecutionTime: number;
    slowestOperation: { operation: string; time: number };
    fastestOperation: { operation: string; time: number };
  } {
    const logs = this.getLogs(agentName, LogLevel.INFO)
      .filter(log => log.executionTime !== undefined && log.metadata?.operation);

    if (logs.length === 0) {
      return {
        totalOperations: 0,
        averageExecutionTime: 0,
        slowestOperation: { operation: 'N/A', time: 0 },
        fastestOperation: { operation: 'N/A', time: 0 }
      };
    }

    const executionTimes = logs.map(log => log.executionTime!);
    const operations = logs.map(log => log.metadata?.operation);

    return {
      totalOperations: logs.length,
      averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      slowestOperation: {
        operation: operations[executionTimes.indexOf(Math.max(...executionTimes))] || 'Unknown',
        time: Math.max(...executionTimes)
      },
      fastestOperation: {
        operation: operations[executionTimes.indexOf(Math.min(...executionTimes))] || 'Unknown',
        time: Math.min(...executionTimes)
      }
    };
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public exportLogs(agentName?: string, format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs(agentName);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'agentName', 'level', 'message', 'executionTime'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          log.timestamp,
          log.agentName,
          LogLevel[log.level],
          `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
          log.executionTime || ''
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }

    return '';
  }
}