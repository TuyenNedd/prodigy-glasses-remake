import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateProductsTable1716480300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'image', type: 'varchar', length: '2048', isNullable: false },
          { name: 'imageHover', type: 'varchar', length: '2048', isNullable: false },
          { name: 'imageDetail', type: 'varchar', length: '2048', isNullable: false },
          { name: 'category_id', type: 'char', length: '36', isNullable: false },
          { name: 'price', type: 'decimal', precision: 12, scale: 0, isNullable: false },
          { name: 'countInStock', type: 'int', unsigned: true, isNullable: false },
          { name: 'discount', type: 'tinyint', isNullable: false, default: 0 },
          { name: 'description', type: 'text', isNullable: false },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          { name: 'reviewCount', type: 'int', unsigned: true, isNullable: false, default: 0 },
          { name: 'selled', type: 'int', unsigned: true, isNullable: false, default: 0 },
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

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_category', columnNames: ['category_id'] }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_price', columnNames: ['price'] }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_rating', columnNames: ['rating'] }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_deletedAt', columnNames: ['deletedAt'] }),
    );

    // FULLTEXT index for search
    await queryRunner.query(
      'ALTER TABLE `products` ADD FULLTEXT INDEX `idx_products_name_fulltext` (`name`)',
    );

    // CHECK constraints
    await queryRunner.query(
      'ALTER TABLE `products` ADD CONSTRAINT `chk_products_price` CHECK (`price` >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `products` ADD CONSTRAINT `chk_products_stock` CHECK (`countInStock` >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `products` ADD CONSTRAINT `chk_products_discount` CHECK (`discount` >= 0 AND `discount` <= 100)',
    );
    await queryRunner.query(
      'ALTER TABLE `products` ADD CONSTRAINT `chk_products_rating` CHECK (`rating` >= 0 AND `rating` <= 5)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('products');
  }
}
