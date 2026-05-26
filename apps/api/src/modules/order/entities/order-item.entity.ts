import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ name: 'order_id', type: 'char', length: 36 })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'varchar', length: 255 })
  nameSnapshot!: string;

  @Column({ type: 'varchar', length: 2048 })
  imageSnapshot!: string;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  priceSnapshot!: number;

  @Column({ type: 'tinyint', default: 0 })
  discountSnapshot!: number;

  @Column({ type: 'int', unsigned: true })
  amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  lineTotal!: number;
}
