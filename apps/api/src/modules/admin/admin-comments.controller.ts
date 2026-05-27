import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';

import { AdminCommentsService } from './admin-comments.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Comments')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminCommentsController {
  constructor(private readonly adminCommentsService: AdminCommentsService) {}

  @Get('comments')
  @ApiOperation({ summary: 'List reviews/comments with filters' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated comments' })
  async listComments(
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
  ) {
    return this.adminCommentsService.listComments({
      productId,
      userId,
      page: page ? Number(page) : undefined,
    });
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment + audit log + recompute rating' })
  @ApiResponse({ status: 204, description: 'Comment deleted' })
  async deleteComment(@Req() req: Request, @Param('id') id: string) {
    const admin = (req as unknown as { user: { id: string } }).user;
    return this.adminCommentsService.deleteComment(id, admin.id);
  }

  @Post('comments/delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete comments' })
  @ApiResponse({ status: 200, description: 'Deleted count' })
  async deleteMany(@Req() req: Request, @Body() body: { ids: string[] }) {
    const admin = (req as unknown as { user: { id: string } }).user;
    return this.adminCommentsService.deleteMany(body.ids, admin.id);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'View audit log entries' })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated audit log' })
  async getAuditLog(
    @Query('event') event?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    return this.adminCommentsService.getAuditLog({
      event,
      from,
      to,
      page: page ? Number(page) : undefined,
    });
  }
}
