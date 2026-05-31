export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const ACTIVE_LEVEL: LogLevel =
  process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;

export class Logger {
  private readonly context: string;
  private readonly level: LogLevel;

  constructor(context: string, level: LogLevel = ACTIVE_LEVEL) {
    this.context = context;
    this.level = level;
  }

  private stamp(level: string): string {
    return `[${new Date().toISOString()}] [${level.padEnd(5)}] [${this.context}]`;
  }

  debug(message: string): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.stamp('DEBUG')} ${message}`);
    }
  }

  info(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.stamp('INFO')} ${message}`);
    }
  }

  warn(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.stamp('WARN')} ${message}`);
    }
  }

  error(message: string): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.stamp('ERROR')} ${message}`);
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
