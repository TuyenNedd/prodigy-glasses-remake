import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { SignUpDto, signUpSchema } from './dto/sign-up.dto';
import { SignInDto, signInSchema } from './dto/sign-in.dto';
import { SignUpResponseDto } from './dto/user-response.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
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

  @Public()
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

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid/expired/reused refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshCookie = req.cookies?.refresh_token as string | undefined;

    const { accessToken, refreshToken } = await this.authService.refresh(refreshCookie, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out — blacklist access token + revoke refresh family' })
  @ApiResponse({ status: 204, description: 'Signed out successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const user = (req as unknown as { user: { id: string; jti: string } }).user;
    const refreshCookie = req.cookies?.refresh_token as string | undefined;

    await this.authService.signOut(user.jti, user.id, refreshCookie);

    // Clear refresh cookie
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 0,
    });
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
