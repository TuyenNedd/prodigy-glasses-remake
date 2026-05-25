import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface HealthCheckResult {
  status: 'ok' | 'error';
  checks: {
    db: 'up' | 'down';
    redis: 'up' | 'down';
    queue: 'up' | 'down';
  };
}

@Controller('health')
export class HealthController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const checks = {
      db: this.checkDb(),
      redis: await this.checkRedis(),
      queue: this.checkQueue(),
    };

    const allUp = Object.values(checks).every((v) => v === 'up');

    if (!allUp) {
      throw new HttpException({ status: 'error', checks }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return { status: 'ok', checks };
  }

  private checkDb(): 'up' | 'down' {
    // Stub: returns 'up' until DatabaseModule integrated into health
    return 'up';
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private checkQueue(): 'up' | 'down' {
    // Stub: returns 'up' until BullMQ is configured (Story 3.7)
    return 'up';
  }
}
