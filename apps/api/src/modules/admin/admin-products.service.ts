import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { Product } from '../catalog/entities/product.entity';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class AdminProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createProduct(data: {
    name: string;
    image: string;
    imageHover: string;
    imageDetail: string;
    categoryId: string;
    price: number;
    countInStock: number;
    discount?: number;
    description: string;
  }) {
    if (data.price < 0) throw new BadRequestException('Price must be >= 0');
    if (data.countInStock < 0) throw new BadRequestException('Stock must be >= 0');
    if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
      throw new BadRequestException('Discount must be 0-100');
    }

    const product = this.productRepository.create({
      id: crypto.randomUUID(),
      name: data.name,
      image: data.image,
      imageHover: data.imageHover,
      imageDetail: data.imageDetail,
      categoryId: data.categoryId,
      price: data.price,
      countInStock: data.countInStock,
      discount: data.discount || 0,
      description: data.description,
    });

    await this.productRepository.save(product);
    await this.invalidateListCache();
    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      image: string;
      imageHover: string;
      imageDetail: string;
      categoryId: string;
      price: number;
      countInStock: number;
      discount: number;
      description: string;
    }>,
  ) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) return null;

    Object.assign(product, data);
    await this.productRepository.save(product);

    // Invalidate caches
    await this.redis.del(`catalog:product:${id}`);
    await this.invalidateListCache();

    return product;
  }

  async deleteProduct(id: string) {
    // Check if product is in active orders
    const inOrders = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('item.productId = :id', { id })
      .andWhere('order.status NOT IN (:...statuses)', { statuses: ['CANCELLED', 'DELIVERED'] })
      .getCount();

    if (inOrders > 0) {
      // Soft delete
      await this.productRepository.softDelete(id);
    } else {
      // Hard delete
      await this.productRepository.delete(id);
    }

    await this.redis.del(`catalog:product:${id}`);
    await this.invalidateListCache();
  }

  async deleteMany(ids: string[]): Promise<{ deletedCount: number }> {
    let count = 0;
    for (const id of ids) {
      await this.deleteProduct(id);
      count++;
    }
    return { deletedCount: count };
  }

  private async invalidateListCache() {
    const keys = await this.redis.keys('catalog:products:list:*');
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
