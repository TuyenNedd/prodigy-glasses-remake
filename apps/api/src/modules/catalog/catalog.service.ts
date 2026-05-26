import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAllCategories(): Promise<
    { id: string; name: string; slug: string; productCount: number }[]
  > {
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

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCount: parseInt(row.productCount, 10) || 0,
    }));
  }
}
