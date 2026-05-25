import { Module, Global } from '@nestjs/common';
import { RedisModule as IoRedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    IoRedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single' as const,
        options: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
  ],
})
export class RedisModule {}
