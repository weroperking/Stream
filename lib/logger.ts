type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDev = process.env.NODE_ENV === 'development';

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(prefix, message, data || '');
      // TODO: Send to error tracking service (Sentry, etc.)
    } else if (isDev) {
      console.log(prefix, message, data || '');
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, error);
  }

  debug(message: string, data?: any) {
    if (isDev) {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
