import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1716480800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'event', type: 'varchar', length: '64', isNullable: false },
          { name: 'actor_id', type: 'char', length: '36', isNullable: true },
          { name: 'actor_role', type: 'enum', enum: ['USER', 'ADMIN', 'SYSTEM'], isNullable: true },
          { name: 'target_type', type: 'varchar', length: '64', isNullable: false },
          { name: 'target_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'payload', type: 'json', isNullable: false },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          { name: 'user_agent', type: 'varchar', length: '512', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ name: 'idx_audit_event_created', columnNames: ['event', 'createdAt'] }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ name: 'idx_audit_target', columnNames: ['target_type', 'target_id'] }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ name: 'idx_audit_actor', columnNames: ['actor_id', 'createdAt'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}
