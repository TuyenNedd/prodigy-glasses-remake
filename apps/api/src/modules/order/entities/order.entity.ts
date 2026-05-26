import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryMethod {
  FAST = 'fast',
  ECONOMICAL = 'economical',
}

export enum PaymentMethod {
  COD = 'COD',
  PAYPAL = 'PAYPAL',
}

@Entity('orders')
export class Order {
  @PrimaryColumn('char', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @Column({ type: 'json' })
  shippingAddress!: Record<string, string>;

  @Column({ type: 'enum', enum: DeliveryMethod })
  deliveryMethod!: DeliveryMethod;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  itemsPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  shippingPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  totalPrice!: number;

  @Column({ name: 'paypal_order_id', type: 'varchar', length: 64, nullable: true, unique: true })
  paypalOrderId!: string | null;

  @Column({ name: 'paypal_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  paypalAmount!: number | null;

  @Column({ name: 'paypal_currency', type: 'char', length: 3, nullable: true })
  paypalCurrency!: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'datetime', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isDelivered!: boolean;

  @Column({ type: 'datetime', nullable: true })
  deliveredAt!: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
