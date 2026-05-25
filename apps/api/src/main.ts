import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino as the application logger
  app.useLogger(app.get(Logger));

  // Global prefix /api
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 API server running on http://localhost:${port}/api`);
}

bootstrap();
