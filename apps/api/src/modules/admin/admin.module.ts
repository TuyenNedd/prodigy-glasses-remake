import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { Order } from '../order/entities/order.entity';
import { Product } from '../catalog/entities/product.entity';
import { User } from '../auth/entities/user.entity';
import { Category } from '../catalog/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, User, Category])],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminProductsController,
    AdminCategoriesController,
  ],
  providers: [AdminService, AdminUsersService, AdminProductsService, AdminCategoriesService],
  exports: [AdminService],
})
export class AdminModule {}
