/**
 * Production-Safe Logger Utility
 * Automatically disables console logs in production mode
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enableInProduction: boolean;
  enabledLevels: LogLevel[];
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isProduction: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      enableInProduction: false,
      enabledLevels: ['log', 'info', 'warn', 'error', 'debug'],
      prefix: '[Mas3ndi]',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log if explicitly enabled
    if (this.isProduction && !this.config.enableInProduction) {
      return false;
    }

    // Check if this log level is enabled
    return this.config.enabledLevels.includes(level);
  }

  private formatMessage(level: LogLevel, message: any, ...args: any[]): any[] {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix;
    const levelIcon = this.getLevelIcon(level);
    
    return [
      `${levelIcon} ${prefix} [${timestamp}] ${level.toUpperCase()}:`,
      message,
      ...args
    ];
  }

  private getLevelIcon(level: LogLevel): string {
    const icons = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🐛'
    };
    return icons[level] || '📝';
  }

  log(message: any, ...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...this.formatMessage('log', message, ...args));
    }
  }

  info(message: any, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: any, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  debug(message: any, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }

  // Group logging
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // Table logging
  table(data: any): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers
export const apiLogger = new Logger({
  prefix: '[API]',
  enabledLevels: ['info', 'warn', 'error'], // Only important logs for API
});

export const performanceLogger = new Logger({
  prefix: '[PERF]',
  enabledLevels: ['debug', 'info'], // Performance-related logs
});

export const errorLogger = new Logger({
  prefix: '[ERROR]',
  enabledLevels: ['error'], // Only errors
  enableInProduction: true, // Keep errors in production for debugging
});

// Override global console in production
if (process.env.NODE_ENV === 'production') {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  // Override console methods to be silent in production
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  
  // Keep console.error for critical issues (optional)
  // console.error = () => {};

  // Provide a way to restore console for debugging
  (window as any).__restoreConsole = () => {
    Object.assign(console, originalConsole);
    logger.info('Console restored for debugging');
  };

  // Provide access to logger in production for debugging
  (window as any).__logger = logger;
  (window as any).__apiLogger = apiLogger;
  (window as any).__performanceLogger = performanceLogger;
  (window as any).__errorLogger = errorLogger;
}

export default logger;
