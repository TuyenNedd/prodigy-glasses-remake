import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserRole } from './entities/user.entity';
import { RefreshToken, RefreshTokenStatus } from './entities/refresh-token.entity';
import { SignUpDto } from './dto/sign-up.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
