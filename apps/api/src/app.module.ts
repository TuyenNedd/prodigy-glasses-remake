import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
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
    AuthModule,
  ],
})
export class AppModule {}
