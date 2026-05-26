import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'token_missing',
        message: 'Access token is required',
      });
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.exists(`auth:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'token_revoked',
          message: 'Token has been revoked',
        });
      }

      // Attach user payload to request
      request.user = { id: payload.sub, role: payload.role, jti: payload.jti };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'token_invalid',
        message: 'Invalid or expired access token',
      });
    }
  }
}
