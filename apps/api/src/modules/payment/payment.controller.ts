import { Controller, Post, Body, Req, HttpCode, HttpStatus, RawBody } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentService } from './payment.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payment')
@Controller('payment/paypal')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @ApiBearerAuth()
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

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayPal webhook receiver (signature verified)' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleWebhook(@Req() req: Request, @RawBody() rawBody: Buffer) {
    const rawBodyStr = rawBody ? rawBody.toString('utf-8') : JSON.stringify(req.body);
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
    }
    return this.paymentService.handleWebhook(rawBodyStr, headers);
  }
}
