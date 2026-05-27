import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../auth/entities/user.entity';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async listUsers(query: { q?: string; role?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 10));

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.q) {
      qb.andWhere('user.email LIKE :q', { q: `%${query.q}%` });
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        address: u.address,
        city: u.city,
        role: u.role,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateUser(
    id: string,
    data: {
      role?: string;
      name?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
    },
  ) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;

    if (data.role !== undefined) user.role = data.role as unknown as typeof user.role;
    if (data.name !== undefined) user.name = data.name;
    if ('phone' in data) user.phone = data.phone ?? null;
    if ('address' in data) user.address = data.address ?? null;
    if ('city' in data) user.city = data.city ?? null;

    await this.userRepository.save(user);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async deleteUser(id: string) {
    // Check if user has orders
    const orderCount = await this.orderRepository.count({ where: { userId: id } });

    if (orderCount > 0) {
      // Soft delete
      await this.userRepository.softDelete(id);
    } else {
      // Hard delete
      await this.userRepository.delete(id);
    }
  }

  async deleteMany(ids: string[]): Promise<{ deletedCount: number }> {
    if (ids.length === 0) return { deletedCount: 0 };

    let deletedCount = 0;
    for (const id of ids) {
      const orderCount = await this.orderRepository.count({ where: { userId: id } });
      if (orderCount > 0) {
        await this.userRepository.softDelete(id);
      } else {
        await this.userRepository.delete(id);
      }
      deletedCount++;
    }
    return { deletedCount };
  }
}
