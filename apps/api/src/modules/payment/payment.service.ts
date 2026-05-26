import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
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
}
