import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'accessToken',
            'refreshToken',
          ],
          censor: '[REDACTED]',
        },
        genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
        customProps: () => ({ service: 'api' }),
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
