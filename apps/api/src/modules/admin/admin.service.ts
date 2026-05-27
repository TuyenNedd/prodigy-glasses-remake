import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { Order } from '../order/entities/order.entity';
import { Product } from '../catalog/entities/product.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getDashboardKpis() {
    // Check cache
    const cacheKey = 'admin:dashboard:kpis';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's orders count
    const todayOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .getCount();

    // Today's revenue
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalPrice)', 'revenue')
      .where('order.createdAt >= :today', { today })
      .andWhere('order.status != :cancelled', { cancelled: 'CANCELLED' })
      .getRawOne<{ revenue: string | null }>();
    const todayRevenue = revenueResult?.revenue ? Number(revenueResult.revenue) : 0;

    // Top 5 products by selled
    const topProducts = await this.productRepository
      .createQueryBuilder('product')
      .select(['product.id', 'product.name', 'product.selled', 'product.price', 'product.image'])
      .orderBy('product.selled', 'DESC')
      .limit(5)
      .getMany();

    // Low stock products (countInStock < 5)
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .select(['product.id', 'product.name', 'product.countInStock', 'product.image'])
      .where('product.countInStock < :threshold', { threshold: 5 })
      .andWhere('product.deletedAt IS NULL')
      .orderBy('product.countInStock', 'ASC')
      .getMany();

    const data = {
      todayOrders,
      todayRevenue,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        selled: p.selled,
        price: Number(p.price),
        image: p.image,
      })),
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        countInStock: p.countInStock,
        image: p.image,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 60);
    return data;
  }
}
