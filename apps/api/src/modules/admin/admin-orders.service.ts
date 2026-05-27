import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';

import { Order, OrderStatus } from '../order/entities/order.entity';

// State machine: valid transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.AWAITING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async listOrders(query: {
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
    paymentMethod?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));

    const qb = this.orderRepository.createQueryBuilder('order').orderBy('order.createdAt', 'DESC');

    if (query.status) qb.andWhere('order.status = :status', { status: query.status });
    if (query.userId) qb.andWhere('order.userId = :userId', { userId: query.userId });
    if (query.paymentMethod) qb.andWhere('order.paymentMethod = :pm', { pm: query.paymentMethod });
    if (query.from) qb.andWhere('order.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('order.createdAt <= :to', { to: query.to });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getOrderDetail(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException({ statusCode: 404, message: 'Order not found' });
    return order;
  }

  async updateOrderStatus(id: string, body: { isDelivered?: boolean; isPaid?: boolean }) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException({ statusCode: 404, message: 'Order not found' });

    let targetStatus: OrderStatus | null = null;

    if (body.isDelivered === true) {
      targetStatus = OrderStatus.DELIVERED;
    } else if (body.isPaid === true) {
      targetStatus = OrderStatus.PAID;
    }

    if (targetStatus) {
      // Validate transition
      const allowed = VALID_TRANSITIONS[order.status];
      if (!allowed.includes(targetStatus)) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'invalid_transition',
          message: `Cannot transition from ${order.status} to ${targetStatus}`,
        });
      }

      order.status = targetStatus;

      if (targetStatus === OrderStatus.DELIVERED) {
        order.isDelivered = true;
        order.deliveredAt = new Date();
      }
      if (targetStatus === OrderStatus.PAID) {
        order.isPaid = true;
        order.paidAt = new Date();
      }
    }

    await this.orderRepository.save(order);

    // Audit log
    try {
      await this.dataSource.query(
        `INSERT INTO audit_logs (id, event, actor_id, actor_role, target_type, target_id, payload, createdAt)
         VALUES (?, ?, 'ADMIN', 'ADMIN', 'order', ?, ?, NOW())`,
        [
          crypto.randomUUID(),
          targetStatus === OrderStatus.DELIVERED ? 'order_delivered' : 'order_status_changed',
          id,
          JSON.stringify({ from: order.status, to: targetStatus }),
        ],
      );
    } catch {
      // Best-effort
    }

    return order;
  }

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }
}
