import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateOrdersAndOrderItems1716480500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'user_id', type: 'char', length: '36', isNullable: false },
          { name: 'shippingAddress', type: 'json', isNullable: false },
          { name: 'deliveryMethod', type: 'enum', enum: ['fast', 'economical'], isNullable: false },
          { name: 'paymentMethod', type: 'enum', enum: ['COD', 'PAYPAL'], isNullable: false },
          { name: 'itemsPrice', type: 'decimal', precision: 12, scale: 0, isNullable: false },
          { name: 'shippingPrice', type: 'decimal', precision: 12, scale: 0, isNullable: false },
          { name: 'totalPrice', type: 'decimal', precision: 12, scale: 0, isNullable: false },
          {
            name: 'paypal_order_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
            isUnique: true,
          },
          { name: 'paypal_amount', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'paypal_currency', type: 'char', length: '3', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'CANCELLED'],
            default: "'PENDING'",
          },
          { name: 'isPaid', type: 'boolean', default: false },
          { name: 'paidAt', type: 'datetime', isNullable: true },
          { name: 'isDelivered', type: 'boolean', default: false },
          { name: 'deliveredAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({ name: 'idx_orders_user_status', columnNames: ['user_id', 'status'] }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({ name: 'idx_orders_status_created', columnNames: ['status', 'createdAt'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'order_id', type: 'char', length: '36', isNullable: false },
          { name: 'product_id', type: 'char', length: '36', isNullable: false },
          { name: 'nameSnapshot', type: 'varchar', length: '255', isNullable: false },
          { name: 'imageSnapshot', type: 'varchar', length: '2048', isNullable: false },
          { name: 'priceSnapshot', type: 'decimal', precision: 12, scale: 0, isNullable: false },
          { name: 'discountSnapshot', type: 'tinyint', isNullable: false, default: 0 },
          { name: 'amount', type: 'int', unsigned: true, isNullable: false },
          { name: 'lineTotal', type: 'decimal', precision: 12, scale: 0, isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'order_items',
      new TableIndex({ name: 'idx_order_items_order', columnNames: ['order_id'] }),
    );
    await queryRunner.createIndex(
      'order_items',
      new TableIndex({ name: 'idx_order_items_product', columnNames: ['product_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');
  }
}
