import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class SeedAdminUser1716480900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminId = crypto.randomUUID();
    const password = process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    await queryRunner.query(
      `INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'ADMIN', NOW(), NOW())`,
      [adminId, 'admin@prodigy-glasses.local', hashedPassword, 'Admin'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE email = ?`, ['admin@prodigy-glasses.local']);
  }
}
