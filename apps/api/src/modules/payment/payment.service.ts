import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus } from '../order/entities/order.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly configService: ConfigService,
  ) {}

  async createPaypalOrder(orderId: string, userId: string): Promise<{ paypalOrderId: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order not found',
      });
    }

    if (order.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Not your order',
      });
    }

    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order is not awaiting payment',
      });
    }

    // Convert VND to USD
    const usdVndRate = this.configService.get<number>('USD_VND_RATE', 24000);
    const amountUsd = (Number(order.totalPrice) / usdVndRate).toFixed(2);

    // Call PayPal API to create order
    const paypalBaseUrl = this.configService.get<string>('PAYPAL_BASE_URL');
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    try {
      // Get access token
      const tokenRes = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        throw new Error(`PayPal token error: ${tokenRes.status}`);
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Create order
      const createRes = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: orderId,
              amount: {
                currency_code: 'USD',
                value: amountUsd,
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        throw new Error(`PayPal create order error: ${createRes.status}`);
      }

      const paypalOrder = (await createRes.json()) as { id: string };

      // Store PayPal order ID on our order
      order.paypalOrderId = paypalOrder.id;
      order.paypalAmount = Number(amountUsd);
      order.paypalCurrency = 'USD';
      await this.orderRepository.save(order);

      return { paypalOrderId: paypalOrder.id };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadGatewayException({
        statusCode: 502,
        error: 'Bad Gateway',
        code: 'payment_provider_error',
        message: 'Failed to create PayPal order',
      });
    }
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<{ status: string }> {
    const logger = new Logger('PaymentService');

    // Verify signature
    const isValid = await this.verifyWebhookSignature(rawBody, headers);
    if (!isValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'webhook_signature_invalid',
        message: 'Invalid webhook signature',
      });
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      event_type: string;
      resource?: { id?: string };
    };

    // Only process PAYMENT.CAPTURE.COMPLETED
    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      logger.log(`Webhook event ${event.event_type} ignored (not PAYMENT.CAPTURE.COMPLETED)`);
      return { status: 'ignored' };
    }

    // Find order by paypal_order_id
    const paypalOrderId = event.resource?.id;
    if (!paypalOrderId) {
      logger.warn('Webhook missing resource.id');
      return { status: 'ignored' };
    }

    const order = await this.orderRepository.findOne({
      where: { paypalOrderId },
    });

    if (!order) {
      logger.warn(`Order not found for PayPal order ${paypalOrderId}`);
      return { status: 'order_not_found' };
    }

    // Mark as paid
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    logger.log(`Order ${order.id} marked as PAID via webhook`);
    return { status: 'processed' };
  }

  private async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');
    const paypalBaseUrl = this.configService.get<string>('PAYPAL_BASE_URL');
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    try {
      // Get access token
      const tokenRes = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) return false;
      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Verify signature via PayPal API
      const verifyRes = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      });

      if (!verifyRes.ok) return false;
      const verifyData = (await verifyRes.json()) as { verification_status: string };
      return verifyData.verification_status === 'SUCCESS';
    } catch {
      return false;
    }
  }
}
