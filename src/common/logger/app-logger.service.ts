import {
  ConsoleLogger,
  Injectable,
  LogLevel,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, renameSync, statSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

type LogMethod = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

type LogRecord = {
  context?: string;
  level: LogMethod | 'fatal';
  message: string;
  meta?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
};

const SUPPORTED_LEVELS: LogLevel[] = ['log', 'debug', 'warn', 'error', 'verbose'];

@Injectable()
export class AppLogger implements LoggerService {
  private readonly consoleLogger: ConsoleLogger;
  private readonly levels: Set<LogLevel>;
  private readonly isProduction: boolean;
  private readonly logFilePath: string;
  private readonly maxFileSizeBytes: number;

  constructor(private readonly configService: ConfigService) {
    const configuredLevel = this.configService.get<string>('LOG_LEVEL') ?? 'log';
    const normalizedLevel = SUPPORTED_LEVELS.includes(configuredLevel as LogLevel)
      ? (configuredLevel as LogLevel)
      : 'log';
    this.levels = new Set(this.resolveLevels(normalizedLevel));
    this.isProduction =
      (this.configService.get<string>('NODE_ENV') ?? 'development') === 'production';
    this.consoleLogger = new ConsoleLogger('App', {
      logLevels: [...this.levels],
    });
    this.logFilePath = join(process.cwd(), 'logs', 'app.log');
    this.maxFileSizeBytes =
      Number(this.configService.get<string>('LOG_MAX_FILE_SIZE') ?? '1024') * 1024;
    mkdirSync(dirname(this.logFilePath), { recursive: true });
  }

  log(message: unknown, context?: string): void {
    this.write('log', this.stringifyMessage(message), context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', this.stringifyMessage(message), context, undefined, stack);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', this.stringifyMessage(message), context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', this.stringifyMessage(message), context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', this.stringifyMessage(message), context);
  }

  fatal(message: unknown, context?: string, stack?: string): void {
    this.write('error', this.stringifyMessage(message), context, { severity: 'fatal' }, stack);
  }

  logRequest(message: string, meta: Record<string, unknown>): void {
    this.write('log', message, 'HTTP', meta);
  }

  logError(message: string, error: unknown, context = 'ExceptionsHandler'): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const meta =
      error instanceof Error
        ? {
            errorName: error.name,
          }
        : undefined;

    this.write('error', message, context, meta, stack);
  }

  private write(
    level: LogMethod,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
    stack?: string,
  ): void {
    if (!this.levels.has(level)) {
      return;
    }

    const record: LogRecord = {
      level,
      message,
      context,
      meta,
      stack,
      timestamp: new Date().toISOString(),
    };

    if (this.isProduction) {
      const line = JSON.stringify(record);
      this.writeToStream(level, line);
      this.writeToFile(line);
      return;
    }

    const metaSuffix = meta ? ` ${JSON.stringify(meta)}` : '';
    const renderedMessage = `${message}${metaSuffix}`;
    if (level === 'error') {
      this.consoleLogger.error(renderedMessage, stack, context);
    } else {
      this.consoleLogger[level](renderedMessage, context);
    }

    this.writeToFile(JSON.stringify(record));
  }

  private writeToStream(level: LogMethod, line: string): void {
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  }

  private writeToFile(line: string): void {
    this.rotateIfNeeded(Buffer.byteLength(`${line}\n`));
    appendFileSync(this.logFilePath, `${line}\n`, 'utf8');
  }

  private rotateIfNeeded(nextEntryBytes: number): void {
    if (!existsSync(this.logFilePath)) {
      return;
    }

    const fileStats = statSync(this.logFilePath);

    if (fileStats.size + nextEntryBytes <= this.maxFileSizeBytes) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    renameSync(
      this.logFilePath,
      this.logFilePath.replace(/\.log$/, `-${timestamp}.log`),
    );
  }

  private resolveLevels(level: LogLevel): LogLevel[] {
    const levelOrder: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    const minimumIndex = levelOrder.indexOf(level);

    return minimumIndex === -1 ? ['log'] : levelOrder.slice(0, minimumIndex + 1);
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    return JSON.stringify(message);
  }
}
