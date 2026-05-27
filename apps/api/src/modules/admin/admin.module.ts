import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { Order } from '../order/entities/order.entity';
import { Product } from '../catalog/entities/product.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, User])],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService, AdminUsersService],
  exports: [AdminService],
})
export class AdminModule {}
