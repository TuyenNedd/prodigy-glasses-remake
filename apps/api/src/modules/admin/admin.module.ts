import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminCommentsController } from './admin-comments.controller';
import { AdminCommentsService } from './admin-comments.service';
import { AdminOrdersGateway } from './admin-orders.gateway';
import { Order } from '../order/entities/order.entity';
import { Product } from '../catalog/entities/product.entity';
import { User } from '../auth/entities/user.entity';
import { Category } from '../catalog/entities/category.entity';
import { Review } from '../catalog/entities/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, User, Category, Review]),
    JwtModule.register({}),
  ],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminCommentsController,
  ],
  providers: [
    AdminService,
    AdminUsersService,
    AdminProductsService,
    AdminCategoriesService,
    AdminOrdersService,
    AdminCommentsService,
    AdminOrdersGateway,
  ],
  exports: [AdminService, AdminOrdersGateway],
})
export class AdminModule {}
