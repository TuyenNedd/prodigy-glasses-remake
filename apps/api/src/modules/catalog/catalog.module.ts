import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ReviewController, ReviewDeleteController } from './review.controller';
import { ReviewService } from './review.service';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { Review } from './entities/review.entity';
import { Order } from '../order/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product, Review, Order])],
  controllers: [CatalogController, ReviewController, ReviewDeleteController],
  providers: [CatalogService, ReviewService],
  exports: [CatalogService, ReviewService],
})
export class CatalogModule {}
