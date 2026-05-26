import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';

import { OrderService } from './order.service';
import type { CheckoutPreviewInput } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview checkout totals before placing order' })
  @ApiResponse({ status: 200, description: 'Checkout preview with computed totals' })
  @ApiResponse({ status: 400, description: 'Cart empty' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  async checkoutPreview(@Req() req: Request, @Body() body: CheckoutPreviewInput) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orderService.checkoutPreview(user.id, body);
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order (atomic transaction with pessimistic lock)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Cart empty' })
  @ApiResponse({ status: 409, description: 'Insufficient stock (concurrent checkout)' })
  async createOrder(@Req() req: Request, @Body() body: CheckoutPreviewInput) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orderService.createOrder(user.id, body);
  }

  @Get('orders/me')
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User orders list' })
  async getMyOrders(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orderService.getMyOrders(user.id, {
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order detail with items' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orderService.getOrderDetail(id, user.id);
  }

  @Delete('orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order and restore stock' })
  @ApiResponse({ status: 200, description: 'Order cancelled, stock restored' })
  @ApiResponse({ status: 403, description: 'Not owner and not admin' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Cannot cancel (wrong status)' })
  async cancelOrder(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { user: { id: string; role: string } }).user;
    return this.orderService.cancelOrder(id, user.id, user.role);
  }
}
