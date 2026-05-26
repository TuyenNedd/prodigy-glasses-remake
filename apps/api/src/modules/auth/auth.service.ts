import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserRole } from './entities/user.entity';
import { RefreshToken, RefreshTokenStatus } from './entities/refresh-token.entity';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';

interface AuditContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async signUp(dto: SignUpDto): Promise<{
    user: UserResponseDto;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check email uniqueness
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'email_already_registered',
        message: 'Email đã được đăng ký',
      });
    }

    // Hash password
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create user
    const userId = crypto.randomUUID();
    const user = this.userRepository.create({
      id: userId,
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      phone: dto.phone || null,
      role: UserRole.USER,
    });

    try {
      await this.userRepository.save(user);
    } catch (error: unknown) {
      // Handle race condition on duplicate email
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'email_already_registered',
          message: 'Email đã được đăng ký',
        });
      }
      throw new InternalServerErrorException('Failed to create user');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(user);

    return {
      user: UserResponseDto.fromEntity(user),
      accessToken,
      refreshToken,
    };
  }

  async getMe(userId: string): Promise<
    UserResponseDto & {
      phone: string | null;
      address: string | null;
      city: string | null;
      avatar: string | null;
    }
  > {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'user_not_found',
        message: 'User not found',
      });
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      city: user.city,
      avatar: user.avatar,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<
    UserResponseDto & {
      phone: string | null;
      address: string | null;
      city: string | null;
      avatar: string | null;
    }
  > {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'user_not_found',
        message: 'User not found',
      });
    }

    // Only update allowed fields — email and role are NOT updatable
    if (dto.name !== undefined) user.name = dto.name;
    if ('phone' in dto) user.phone = dto.phone === null ? null : (dto.phone ?? user.phone);
    if ('address' in dto)
      user.address = dto.address === null ? null : (dto.address ?? user.address);
    if ('city' in dto) user.city = dto.city === null ? null : (dto.city ?? user.city);
    if ('avatar' in dto) user.avatar = dto.avatar === null ? null : (dto.avatar ?? user.avatar);

    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      city: user.city,
      avatar: user.avatar,
    };
  }

  async signIn(dto: SignInDto): Promise<{
    user: UserResponseDto;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user with password (select: false requires addSelect)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'invalid_credentials',
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'invalid_credentials',
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(user);

    return {
      user: UserResponseDto.fromEntity(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    refreshCookie: string | undefined,
    audit: AuditContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Missing cookie
    if (!refreshCookie) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'refresh_missing',
        message: 'Refresh token cookie is missing',
      });
    }

    // Verify JWT signature + decode
    let payload: { sub: string; family_id: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshCookie, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error: unknown) {
      const isExpired = error instanceof Error && error.name === 'TokenExpiredError';
      if (isExpired) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'refresh_expired',
          message: 'Refresh token has expired',
        });
      }
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'refresh_invalid',
        message: 'Invalid refresh token',
      });
    }

    // Lookup token in DB
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { id: payload.jti },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'refresh_invalid',
        message: 'Refresh token not found',
      });
    }

    // REUSE DETECTION: if token is already rotated, revoke entire family
    if (tokenRecord.status === RefreshTokenStatus.ROTATED) {
      await this.revokeFamilyAndAudit(tokenRecord.familyId, tokenRecord.userId, audit);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'refresh_reuse_detected',
        message: 'Token reuse detected — entire family revoked',
      });
    }

    // If token is revoked (family was already revoked)
    if (tokenRecord.status === RefreshTokenStatus.REVOKED) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'family_revoked',
        message: 'Token family has been revoked',
      });
    }

    // Token is active — proceed with rotation
    // Mark old token as rotated
    tokenRecord.status = RefreshTokenStatus.ROTATED;
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new token pair (same family, parent = old jti)
    const newAccessJti = crypto.randomUUID();
    const newRefreshJti = crypto.randomUUID();

    const accessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        role: (await this.userRepository.findOne({ where: { id: payload.sub } }))?.role || 'USER',
        jti: newAccessJti,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      } as JwtSignOptions,
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: payload.sub,
        family_id: tokenRecord.familyId,
        jti: newRefreshJti,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      } as JwtSignOptions,
    );

    // Persist new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newTokenEntity = this.refreshTokenRepository.create({
      id: newRefreshJti,
      userId: payload.sub,
      familyId: tokenRecord.familyId,
      parentId: tokenRecord.id, // parent = old token jti
      status: RefreshTokenStatus.ACTIVE,
      expiresAt,
    });

    await this.refreshTokenRepository.save(newTokenEntity);

    return { accessToken, refreshToken };
  }

  async signOut(
    accessJti: string,
    userId: string,
    refreshCookie: string | undefined,
  ): Promise<void> {
    // 1. Blacklist the access token JTI in Redis (TTL = 15min max access token life)
    await this.redis.set(`auth:blacklist:${accessJti}`, '1', 'EX', 15 * 60);

    // 2. Revoke entire refresh family if we have the cookie
    if (refreshCookie) {
      try {
        const payload = this.jwtService.decode(refreshCookie) as {
          jti?: string;
          family_id?: string;
        } | null;
        if (payload?.jti) {
          const tokenRecord = await this.refreshTokenRepository.findOne({
            where: { id: payload.jti },
          });
          if (tokenRecord) {
            await this.refreshTokenRepository.update(
              { familyId: tokenRecord.familyId },
              { status: RefreshTokenStatus.REVOKED },
            );
          }
        }
      } catch {
        // Best-effort family revocation
      }
    } else {
      // No cookie — revoke all active tokens for this user
      await this.refreshTokenRepository.update(
        { userId, status: RefreshTokenStatus.ACTIVE },
        { status: RefreshTokenStatus.REVOKED },
      );
    }
  }

  private async revokeFamilyAndAudit(
    familyId: string,
    userId: string,
    audit: AuditContext,
  ): Promise<void> {
    // Revoke all tokens in the family
    await this.refreshTokenRepository.update({ familyId }, { status: RefreshTokenStatus.REVOKED });

    // Write audit log (best-effort, don't block on failure)
    try {
      const dataSource = this.refreshTokenRepository.manager.connection;
      await dataSource.query(
        `INSERT INTO audit_logs (id, event, actor_id, actor_role, target_type, target_id, payload, ip, user_agent, createdAt)
         VALUES (?, 'refresh_reuse_detected', ?, 'SYSTEM', 'refresh_token_family', ?, ?, ?, ?, NOW())`,
        [
          crypto.randomUUID(),
          userId,
          familyId,
          JSON.stringify({ family_id: familyId, user_id: userId }),
          audit.ip || null,
          audit.userAgent || null,
        ],
      );
    } catch {
      // Best-effort audit — don't fail the request
    }
  }

  private async generateTokenPair(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();
    const familyId = crypto.randomUUID();

    // Access token
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        role: user.role,
        jti: accessJti,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      } as JwtSignOptions,
    );

    // Refresh token
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        family_id: familyId,
        jti: refreshJti,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      } as JwtSignOptions,
    );

    // Persist refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      id: refreshJti,
      userId: user.id,
      familyId: familyId,
      parentId: null,
      status: RefreshTokenStatus.ACTIVE,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }
}
