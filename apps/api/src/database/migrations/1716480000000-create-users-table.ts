import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1716480000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: false, isUnique: true },
          { name: 'password', type: 'varchar', length: '60', isNullable: false },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'address', type: 'varchar', length: '255', isNullable: true },
          { name: 'city', type: 'varchar', length: '120', isNullable: true },
          { name: 'avatar', type: 'varchar', length: '2048', isNullable: true },
          { name: 'role', type: 'enum', enum: ['USER', 'ADMIN'], default: "'USER'" },
          { name: 'deletedAt', type: 'datetime', isNullable: true },
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

    await queryRunner.createIndex(
      'users',
      new TableIndex({ name: 'idx_users_role', columnNames: ['role'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
