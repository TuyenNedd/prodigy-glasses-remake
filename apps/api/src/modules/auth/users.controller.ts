import { Controller, Patch, Body, Req, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { UpdateProfileDto, updateProfileSchema } from './dto/update-profile.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Patch('me')
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.authService.updateProfile(user.id, dto);
  }
}
