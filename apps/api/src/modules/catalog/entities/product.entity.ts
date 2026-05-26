import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('products')
export class Product {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 2048 })
  image!: string;

  @Column({ type: 'varchar', length: 2048 })
  imageHover!: string;

  @Column({ type: 'varchar', length: 2048 })
  imageDetail!: string;

  @Column({ name: 'category_id', type: 'char', length: 36 })
  categoryId!: string;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  price!: number;

  @Column({ type: 'int', unsigned: true })
  countInStock!: number;

  @Column({ type: 'tinyint', default: 0 })
  discount!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  reviewCount!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  selled!: number;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
