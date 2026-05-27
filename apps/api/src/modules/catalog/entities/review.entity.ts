import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('reviews')
export class Review {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'varchar', length: 1000 })
  content!: string;

  @Column({ type: 'tinyint' })
  star!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
