import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36, unique: true })
  userId!: string;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true, eager: true })
  items!: CartItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
