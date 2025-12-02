/**
 * Production-Safe Logger Utility for Backend
 * Automatically manages console logs based on environment and log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  prefix?: string;
  colors?: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || (isProduction ? 'warn' : 'debug'),
      enableConsole: !isProduction && !isTest, // Disable console in production and test
      enableFile: isProduction, // Enable file logging in production
      prefix: '[Mas3ndi-API]',
      colors: !isProduction,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: any, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix;
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `[${timestamp}] ${prefix} ${levelStr}: ${message}`;
    
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
    }
    
    return formattedMessage;
  }

  private getColorCode(level: LogLevel): string {
    if (!this.config.colors) return '';
    
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    return colors[level] || '';
  }

  private resetColor(): string {
    return this.config.colors ? '\x1b[0m' : '';
  }

  private log(level: LogLevel, message: any, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, ...args);
    const colorCode = this.getColorCode(level);
    const resetColor = this.resetColor();

    // Console logging (disabled in production)
    if (this.config.enableConsole) {
      const consoleMessage = `${colorCode}${formattedMessage}${resetColor}`;
      
      switch (level) {
        case 'debug':
          console.debug(consoleMessage);
          break;
        case 'info':
          console.info(consoleMessage);
          break;
        case 'warn':
          console.warn(consoleMessage);
          break;
        case 'error':
          console.error(consoleMessage);
          break;
      }
    }

    // File logging (enabled in production)
    if (this.config.enableFile) {
      // In a real production environment, you would write to a file here
      // For now, we'll use a structured logging approach
      this.writeToFile(level, formattedMessage);
    }
  }

  private writeToFile(level: LogLevel, message: string): void {
    // In production, you would implement actual file writing here
    // For now, we'll use a structured approach that can be captured by log aggregators
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'mas3ndi-api',
      message,
      environment: process.env.NODE_ENV,
    };

    // This would be captured by Docker logs or log aggregation services
    if (level === 'error') {
      process.stderr.write(JSON.stringify(logEntry) + '\n');
    } else {
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    }
  }

  debug(message: any, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: any, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: any, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: any, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  // HTTP request logging
  request(method: string, path: string, statusCode?: number, duration?: number): void {
    const message = `${method} ${path}${statusCode ? ` - ${statusCode}` : ''}${duration ? ` (${duration}ms)` : ''}`;
    this.info(message);
  }

  // Database query logging
  query(sql: string, duration?: number): void {
    const message = `DB Query${duration ? ` (${duration}ms)` : ''}: ${sql}`;
    this.debug(message);
  }

  // Performance timing
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }
}

// Create logger instances
export const logger = new Logger();

export const apiLogger = new Logger({
  prefix: '[API]',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export const dbLogger = new Logger({
  prefix: '[DB]',
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
});

export const smsLogger = new Logger({
  prefix: '[SMS]',
  level: 'info', // Always log SMS operations
});

export const errorLogger = new Logger({
  prefix: '[ERROR]',
  level: 'error',
  enableConsole: true, // Always enable console for errors
  enableFile: true,
});

// Override console in production
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
  // console.error = (...args) => errorLogger.error(...args);

  // Provide a way to restore console for debugging
  (global as any).__restoreConsole = () => {
    Object.assign(console, originalConsole);
    logger.info('Console restored for debugging');
  };

  // Provide access to loggers for debugging
  (global as any).__logger = logger;
  (global as any).__apiLogger = apiLogger;
  (global as any).__dbLogger = dbLogger;
  (global as any).__smsLogger = smsLogger;
  (global as any).__errorLogger = errorLogger;
}

export default logger;
