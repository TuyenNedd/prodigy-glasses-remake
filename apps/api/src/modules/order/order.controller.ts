import { Controller, Post, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
