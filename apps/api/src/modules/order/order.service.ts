import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Order, OrderStatus, DeliveryMethod, PaymentMethod } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../catalog/entities/product.entity';

const SHIPPING_PRICES: Record<DeliveryMethod, number> = {
  [DeliveryMethod.FAST]: 30000,
  [DeliveryMethod.ECONOMICAL]: 15000,
};

export interface CheckoutPreviewInput {
  shippingAddress: Record<string, string>;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
}

export interface CheckoutPreviewResponse {
  items: {
    productId: string;
    name: string;
    price: number;
    discount: number;
    amount: number;
    lineTotal: number;
  }[];
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
  ) {}

  async checkoutPreview(
    userId: string,
    input: CheckoutPreviewInput,
  ): Promise<CheckoutPreviewResponse> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: true } },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'cart_empty',
        message: 'Your cart is empty',
      });
    }

    // Check stock for all items
    for (const item of cart.items) {
      if (!item.product || item.product.deletedAt) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'insufficient_stock',
          message: `Product "${item.product?.name || 'unknown'}" is no longer available`,
        });
      }
      if (item.amount > item.product.countInStock) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'insufficient_stock',
          message: `Only ${item.product.countInStock} of "${item.product.name}" available (you have ${item.amount})`,
        });
      }
    }

    const shippingPrice = SHIPPING_PRICES[input.deliveryMethod];
    const items = cart.items.map((item) => {
      const effectivePrice = Number(item.product.price) * (1 - item.product.discount / 100);
      return {
        productId: item.productId,
        name: item.product.name,
        price: Number(item.product.price),
        discount: item.product.discount,
        amount: item.amount,
        lineTotal: Math.round(effectivePrice * item.amount),
      };
    });

    const itemsPrice = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return {
      items,
      itemsPrice,
      shippingPrice,
      totalPrice: itemsPrice + shippingPrice,
      deliveryMethod: input.deliveryMethod,
      paymentMethod: input.paymentMethod,
    };
  }

  async createOrder(
    userId: string,
    input: CheckoutPreviewInput,
  ): Promise<{
    orderId: string;
    status: OrderStatus;
    totalPrice: number;
  }> {
    // Run entire checkout in a single ACID transaction with pessimistic locks
    return this.dataSource.transaction(async (manager) => {
      // 1. Get cart
      const cart = await manager.findOne(Cart, {
        where: { userId },
        relations: { items: true },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'cart_empty',
          message: 'Your cart is empty',
        });
      }

      const productIds = cart.items.map((i) => i.productId);

      // 2. SELECT FOR UPDATE — lock product rows
      const products = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .whereInIds(productIds)
        .getMany();

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 3. Validate stock
      for (const item of cart.items) {
        const product = productMap.get(item.productId);
        if (!product || product.deletedAt) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            code: 'insufficient_stock',
            message: `Product is no longer available`,
          });
        }
        if (item.amount > product.countInStock) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            code: 'insufficient_stock',
            message: `Only ${product.countInStock} of "${product.name}" available`,
          });
        }
      }

      // 4. Decrement stock
      for (const item of cart.items) {
        await manager
          .createQueryBuilder()
          .update(Product)
          .set({ countInStock: () => `countInStock - ${item.amount}` })
          .where('id = :id', { id: item.productId })
          .execute();
      }

      // 5. Create order
      const shippingPrice = SHIPPING_PRICES[input.deliveryMethod];
      const orderItems: OrderItem[] = [];
      let itemsPrice = 0;

      for (const item of cart.items) {
        const product = productMap.get(item.productId)!;
        const effectivePrice = Number(product.price) * (1 - product.discount / 100);
        const lineTotal = Math.round(effectivePrice * item.amount);
        itemsPrice += lineTotal;

        const orderItem = manager.create(OrderItem, {
          id: crypto.randomUUID(),
          productId: item.productId,
          nameSnapshot: product.name,
          imageSnapshot: product.image,
          priceSnapshot: Number(product.price),
          discountSnapshot: product.discount,
          amount: item.amount,
          lineTotal,
        });
        orderItems.push(orderItem);
      }

      const totalPrice = itemsPrice + shippingPrice;
      const status =
        input.paymentMethod === PaymentMethod.PAYPAL
          ? OrderStatus.AWAITING_PAYMENT
          : OrderStatus.PENDING;

      const order = manager.create(Order, {
        id: crypto.randomUUID(),
        userId,
        shippingAddress: input.shippingAddress,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        itemsPrice,
        shippingPrice,
        totalPrice,
        status,
        isPaid: false,
        isDelivered: false,
        items: orderItems,
      });

      await manager.save(Order, order);

      // 6. Clear cart
      await manager.delete(CartItem, { cartId: cart.id });

      return {
        orderId: order.id,
        status: order.status,
        totalPrice: Number(order.totalPrice),
      };
    });
  }
}
