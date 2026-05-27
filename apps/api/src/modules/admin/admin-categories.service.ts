import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { Category } from '../catalog/entities/category.entity';
import { Product } from '../catalog/entities/product.entity';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class AdminCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createCategory(name: string) {
    const slug = toSlug(name);
    const category = this.categoryRepository.create({
      id: crypto.randomUUID(),
      name,
      slug,
    });
    await this.categoryRepository.save(category);
    await this.invalidateCache();
    return category;
  }

  async updateCategory(id: string, name: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) return null;

    category.name = name;
    category.slug = toSlug(name);
    await this.categoryRepository.save(category);
    await this.invalidateCache();
    return category;
  }

  async deleteCategory(id: string) {
    // Check if category has products
    const productCount = await this.productRepository.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'category_has_products',
        message: `Cannot delete category with ${productCount} associated products`,
      });
    }

    await this.categoryRepository.delete(id);
    await this.invalidateCache();
  }

  private async invalidateCache() {
    await this.redis.del('catalog:categories:all');
  }
}
