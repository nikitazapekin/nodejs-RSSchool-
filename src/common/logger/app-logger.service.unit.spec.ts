import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'knowledge-hub-logger-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes human-readable logs to file', () => {
    const logger = new AppLogger({
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LOG_LEVEL: 'debug',
          LOG_MAX_FILE_SIZE: '1024',
        };

        return config[key];
      }),
    } as unknown as ConfigService);

    logger.logRequest('Incoming request', {
      password: '[REDACTED]',
      method: 'POST',
    });

    const logFile = readFileSync(join(tempDir, 'logs', 'app.log'), 'utf8');
    expect(logFile).toContain('"message":"Incoming request"');
    expect(logFile).toContain('"password":"[REDACTED]"');
  });

  it('rotates log files when size limit is exceeded', () => {
    const logger = new AppLogger({
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          LOG_LEVEL: 'log',
          LOG_MAX_FILE_SIZE: '0',
        };

        return config[key];
      }),
    } as unknown as ConfigService);

    logger.log('first log line that fills the file');
    logger.log('second log line that triggers rotation');

    const files = readdirSync(join(tempDir, 'logs'));
    expect(files.some((file) => file === 'app.log')).toBe(true);
    expect(files.some((file) => file.startsWith('app-') && file.endsWith('.log'))).toBe(true);
  });

  it('respects log level filtering', () => {
    const logger = new AppLogger({
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LOG_LEVEL: 'warn',
          LOG_MAX_FILE_SIZE: '1024',
        };

        return config[key];
      }),
    } as unknown as ConfigService);

    logger.log('should be skipped');
    logger.warn('should be logged');

    const logFile = readFileSync(join(tempDir, 'logs', 'app.log'), 'utf8');
    expect(logFile).toContain('"message":"should be logged"');
    expect(logFile).not.toContain('"message":"should be skipped"');
  });
});
