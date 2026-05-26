import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

export interface ProductListQuery {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  q?: string;
}

const VALID_SORTS = ['price_asc', 'price_desc', 'rating_desc', 'newest'];

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async findAllCategories(): Promise<
    { id: string; name: string; slug: string; productCount: number }[]
  > {
    // Check cache
    const cacheKey = 'catalog:categories:all';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const results = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.deletedAt IS NULL')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('category.slug', 'slug')
      .addSelect('COUNT(product.id)', 'productCount')
      .groupBy('category.id')
      .orderBy('category.name', 'ASC')
      .getRawMany<{ id: string; name: string; slug: string; productCount: string }>();

    const data = results.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCount: parseInt(row.productCount, 10) || 0,
    }));

    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
    return data;
  }

  async findProducts(query: ProductListQuery): Promise<{
    data: Product[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { categoryId, minPrice, maxPrice, minRating, sort, q } = query;
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 12));

    // Validate sort
    if (sort && !VALID_SORTS.includes(sort)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid sort value. Must be one of: ${VALID_SORTS.join(', ')}`,
      });
    }

    // Cache key based on query hash
    const queryHash = crypto
      .createHash('md5')
      .update(
        JSON.stringify({ categoryId, minPrice, maxPrice, minRating, sort, page, pageSize, q }),
      )
      .digest('hex');
    const cacheKey = `catalog:products:list:${queryHash}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Build query
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NULL');

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }
    if (minRating !== undefined) {
      qb.andWhere('product.rating >= :minRating', { minRating });
    }
    if (q) {
      qb.andWhere('LOWER(product.name) LIKE :search', { search: `%${q.toLowerCase()}%` });
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'rating_desc':
        qb.orderBy('product.rating', 'DESC');
        break;
      case 'newest':
        qb.orderBy('product.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }

    // Pagination
    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const result = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30);
    return result;
  }

  async findProductById(id: string): Promise<Product> {
    // Check cache
    const cacheKey = `catalog:product:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    await this.redis.set(cacheKey, JSON.stringify(product), 'EX', 60);
    return product;
  }
}
