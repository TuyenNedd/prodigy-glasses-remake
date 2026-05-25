import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';

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
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthCheckResult {
    // Stub checks — real implementations come in Story 1.3 (Docker), 1.4 (TypeORM), 1.7 (Redis)
    const checks = {
      db: this.checkDb(),
      redis: this.checkRedis(),
      queue: this.checkQueue(),
    };

    const allUp = Object.values(checks).every((v) => v === 'up');

    if (!allUp) {
      throw new HttpException({ status: 'error', checks }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return { status: 'ok', checks };
  }

  private checkDb(): 'up' | 'down' {
    // Stub: returns 'up' until TypeORM is connected (Story 1.4)
    return 'up';
  }

  private checkRedis(): 'up' | 'down' {
    // Stub: returns 'up' until Redis module is connected (Story 1.7)
    return 'up';
  }

  private checkQueue(): 'up' | 'down' {
    // Stub: returns 'up' until BullMQ is configured (Story 3.7)
    return 'up';
  }
}
