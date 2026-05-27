import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AdminOrdersService } from './admin-orders.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'paymentMethod', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated orders' })
  async listOrders(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminOrdersService.listOrders({
      status,
      userId,
      from,
      to,
      paymentMethod,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail with items' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(@Param('id') id: string) {
    return this.adminOrdersService.getOrderDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status (mark delivered/paid)' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  @ApiResponse({ status: 409, description: 'Invalid state transition' })
  async updateOrder(
    @Param('id') id: string,
    @Body() body: { isDelivered?: boolean; isPaid?: boolean },
  ) {
    return this.adminOrdersService.updateOrderStatus(id, body);
  }
}
