import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProcessedWebhookEvents1716480700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'processed_webhook_events',
        columns: [
          { name: 'event_id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'order_id', type: 'char', length: '36', isNullable: false },
          { name: 'event_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'payload_summary', type: 'json', isNullable: false },
          { name: 'processed_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'processed_webhook_events',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'processed_webhook_events',
      new TableIndex({ name: 'idx_pwe_order', columnNames: ['order_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('processed_webhook_events');
  }
}
