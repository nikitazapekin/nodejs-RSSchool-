import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppLogger } from './common/logger/app-logger.service';

function registerProcessErrorHandlers(
  app: INestApplication,
  logger: AppLogger,
): void {
  let shuttingDown = false;

  const gracefulShutdown = async (reason: string, error: unknown): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.fatal(`Process-level failure: ${reason}`, 'Process', error instanceof Error ? error.stack : undefined);

    try {
      await app.close();
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) => {
    void gracefulShutdown('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    void gracefulShutdown('unhandledRejection', reason);
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  registerProcessErrorHandlers(app, logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('REST API for articles, categories, comments, and users')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('doc', app, document);

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? '4000');
  const host = configService.get<string>('HOST') ?? '0.0.0.0';

  await app.listen(port, host);
  logger.log(`Knowledge Hub API is listening on http://${host}:${port}`, 'Bootstrap');
}

void bootstrap();
