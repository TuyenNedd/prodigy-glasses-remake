import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { Review } from '../catalog/entities/review.entity';
import { Product } from '../catalog/entities/product.entity';

@Injectable()
export class AdminCommentsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async listComments(query: { productId?: string; userId?: string; page?: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = 10;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .orderBy('review.createdAt', 'DESC');

    if (query.productId)
      qb.andWhere('review.productId = :productId', { productId: query.productId });
    if (query.userId) qb.andWhere('review.userId = :userId', { userId: query.userId });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async deleteComment(id: string, adminId: string) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException({ statusCode: 404, message: 'Comment not found' });

    const productId = review.productId;
    await this.reviewRepository.remove(review);

    // Audit log (best-effort async)
    this.writeAuditLog(adminId, id, productId).catch(() => {});

    // Recompute rating
    await this.recomputeRating(productId);
  }

  async deleteMany(ids: string[], adminId: string): Promise<{ deletedCount: number }> {
    let count = 0;
    for (const id of ids) {
      try {
        await this.deleteComment(id, adminId);
        count++;
      } catch {
        // Skip not found
      }
    }
    return { deletedCount: count };
  }

  async getAuditLog(query: { event?: string; from?: string; to?: string; page?: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = 20;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: unknown[] = [];

    if (query.event) {
      sql += ' AND event = ?';
      params.push(query.event);
    }
    if (query.from) {
      sql += ' AND createdAt >= ?';
      params.push(query.from);
    }
    if (query.to) {
      sql += ' AND createdAt <= ?';
      params.push(query.to);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
    const countResult = await this.dataSource.query(countSql, params);
    const total = countResult[0]?.cnt || 0;

    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const data = await this.dataSource.query(sql, params);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  private async writeAuditLog(adminId: string, commentId: string, productId: string) {
    await this.dataSource.query(
      `INSERT INTO audit_logs (id, event, actor_id, actor_role, target_type, target_id, payload, createdAt)
       VALUES (?, 'comment_deleted_by_admin', ?, 'ADMIN', 'review', ?, ?, NOW())`,
      [crypto.randomUUID(), adminId, commentId, JSON.stringify({ commentId, productId, adminId })],
    );
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
    await this.redis.del(`catalog:product:${productId}`);
    const keys = await this.redis.keys('catalog:products:list:*');
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
