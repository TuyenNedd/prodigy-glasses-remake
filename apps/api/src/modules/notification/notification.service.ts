import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface EmailJobData {
  type: 'order-confirmed' | 'order-paid' | 'order-delivered';
  orderId: string;
  userEmail: string;
  userName: string;
  totalPrice: number;
  items?: { name: string; amount: number; lineTotal: number }[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async enqueueOrderConfirmed(data: Omit<EmailJobData, 'type'>): Promise<void> {
    await this.emailQueue.add(
      'email:order-confirmed',
      { ...data, type: 'order-confirmed' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    this.logger.log(`Enqueued order-confirmed email for order ${data.orderId}`);
  }

  async enqueueOrderPaid(data: Omit<EmailJobData, 'type'>): Promise<void> {
    await this.emailQueue.add(
      'email:order-paid',
      { ...data, type: 'order-paid' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    this.logger.log(`Enqueued order-paid email for order ${data.orderId}`);
  }

  async enqueueOrderDelivered(data: Omit<EmailJobData, 'type'>): Promise<void> {
    await this.emailQueue.add(
      'email:order-delivered',
      { ...data, type: 'order-delivered' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    this.logger.log(`Enqueued order-delivered email for order ${data.orderId}`);
  }
}
