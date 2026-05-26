import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentService } from './payment.service';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment/paypal')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create PayPal order for an existing order' })
  @ApiResponse({ status: 200, description: 'PayPal order created' })
  @ApiResponse({ status: 403, description: 'Not your order' })
  @ApiResponse({ status: 404, description: 'Order not found or not awaiting payment' })
  @ApiResponse({ status: 502, description: 'PayPal provider error' })
  async createPaypalOrder(@Req() req: Request, @Body() body: { orderId: string }) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.paymentService.createPaypalOrder(body.orderId, user.id);
  }
}
