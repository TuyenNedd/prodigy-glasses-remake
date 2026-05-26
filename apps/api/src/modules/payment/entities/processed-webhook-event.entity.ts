import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('processed_webhook_events')
export class ProcessedWebhookEvent {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ name: 'order_id', type: 'char', length: 36 })
  orderId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'payload_summary', type: 'json' })
  payloadSummary!: Record<string, unknown>;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}
