import {
  Controller,
  Post,
  Body,
  Res,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { SignUpDto, signUpSchema } from './dto/sign-up.dto';
import { SignInDto, signInSchema } from './dto/sign-in.dto';
import { SignUpResponseDto } from './dto/user-response.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signUpSchema))
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: SignUpResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignUpResponseDto> {
    const { user, accessToken, refreshToken } = await this.authService.signUp(dto);

    this.setRefreshCookie(res, refreshToken);

    return { user, accessToken };
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(new ZodValidationPipe(signInSchema))
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'Sign-in successful', type: SignUpResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignUpResponseDto> {
    const { user, accessToken, refreshToken } = await this.authService.signIn(dto);

    this.setRefreshCookie(res, refreshToken);

    return { user, accessToken };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
