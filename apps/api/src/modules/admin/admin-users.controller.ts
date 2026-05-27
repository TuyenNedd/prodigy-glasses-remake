import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';

import { AdminUsersService } from './admin-users.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search and filter' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  async listUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminUsersService.listUsers({
      q,
      role,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (role, name, phone, address, city)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      role?: string;
      name?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
    },
  ) {
    return this.adminUsersService.updateUser(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft if has orders, hard otherwise)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete self' })
  async deleteUser(@Req() req: Request, @Param('id') id: string) {
    const admin = (req as unknown as { user: { id: string } }).user;
    if (admin.id === id) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'cannot_delete_self',
        message: 'Admin cannot delete themselves',
      });
    }
    return this.adminUsersService.deleteUser(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({ status: 200, description: 'Deleted count' })
  async deleteMany(@Req() req: Request, @Body() body: { ids: string[] }) {
    const admin = (req as unknown as { user: { id: string } }).user;
    const ids = body.ids.filter((id) => id !== admin.id);
    return this.adminUsersService.deleteMany(ids);
  }
}
