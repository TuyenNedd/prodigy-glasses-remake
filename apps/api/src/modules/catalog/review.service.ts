import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { Review } from './entities/review.entity';
import { Product } from './entities/product.entity';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getProductReviews(productId: string, page = 1, pageSize = 10) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Get user names (without exposing userId/email)
    const data = await Promise.all(
      reviews.map(async (r) => {
        const user = await this.reviewRepository.manager.query(
          'SELECT name FROM users WHERE id = ?',
          [r.userId],
        );
        return {
          id: r.id,
          content: r.content,
          star: r.star,
          userName: user[0]?.name || 'Anonymous',
          createdAt: r.createdAt,
        };
      }),
    );

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async submitReview(userId: string, productId: string, content: string, star: number) {
    // Validate star
    if (star < 1 || star > 5 || !Number.isInteger(star)) {
      throw new BadRequestException({ statusCode: 400, message: 'Star must be integer 1-5' });
    }
    // Validate content
    if (!content || content.length < 1 || content.length > 1000) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Content must be 1-1000 characters',
      });
    }

    // Check verified purchase: user must have a DELIVERED order containing this product
    const hasPurchased = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: 'DELIVERED' })
      .andWhere('item.productId = :productId', { productId })
      .getCount();

    if (hasPurchased === 0) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'purchase_required',
        message: 'You must have a delivered order with this product to leave a review',
      });
    }

    // Check if already reviewed
    const existing = await this.reviewRepository.findOne({
      where: { userId, productId },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'already_reviewed',
        message: 'You have already reviewed this product',
      });
    }

    // Create review
    const review = this.reviewRepository.create({
      id: crypto.randomUUID(),
      userId,
      productId,
      content,
      star,
    });
    await this.reviewRepository.save(review);

    // Recompute product rating
    await this.recomputeRating(productId);

    return {
      id: review.id,
      content: review.content,
      star: review.star,
      createdAt: review.createdAt,
    };
  }

  async deleteReview(reviewId: string, userId: string, userRole: string) {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException({ statusCode: 404, message: 'Review not found' });
    }

    // Owner or admin
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not authorized to delete this review',
      });
    }

    const productId = review.productId;
    await this.reviewRepository.remove(review);

    // Recompute rating
    await this.recomputeRating(productId);

    return { deleted: true };
  }

  private async recomputeRating(productId: string) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.star)', 'avgRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.productId = :productId', { productId })
      .getRawOne<{ avgRating: string | null; reviewCount: string }>();

    const rating = result?.avgRating ? parseFloat(result.avgRating) : 0;
    const reviewCount = result?.reviewCount ? parseInt(result.reviewCount, 10) : 0;

    await this.productRepository.update(productId, { rating, reviewCount });

    // Invalidate cache
    await this.redis.del(`catalog:product:${productId}`);
    // Scan and delete list caches
    const keys = await this.redis.keys('catalog:products:list:*');
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
