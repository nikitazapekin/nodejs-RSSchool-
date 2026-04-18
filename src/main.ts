import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
  logger.log(`Knowledge Hub API is listening on http://${host}:${port}`);
}

void bootstrap();
