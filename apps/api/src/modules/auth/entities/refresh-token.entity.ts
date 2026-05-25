import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum RefreshTokenStatus {
  ACTIVE = 'active',
  ROTATED = 'rotated',
  REVOKED = 'revoked',
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn('char', { length: 36 })
  id!: string; // = JWT jti

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'family_id', type: 'char', length: 36 })
  familyId!: string;

  @Column({ name: 'parent_id', type: 'char', length: 36, nullable: true })
  parentId!: string | null;

  @Column({
    type: 'enum',
    enum: RefreshTokenStatus,
    default: RefreshTokenStatus.ACTIVE,
  })
  status!: RefreshTokenStatus;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
