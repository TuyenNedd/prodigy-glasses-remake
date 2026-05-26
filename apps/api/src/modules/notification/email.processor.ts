import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';

import type { EmailJobData } from './notification.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: false,
    });
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { type, orderId, userEmail, userName, totalPrice } = job.data;

    const subjects: Record<string, string> = {
      'order-confirmed': `Order Confirmed — #${orderId.slice(0, 8)}`,
      'order-paid': `Payment Received — #${orderId.slice(0, 8)}`,
      'order-delivered': `Order Delivered — #${orderId.slice(0, 8)}`,
    };

    const subject = subjects[type] || `Order Update — #${orderId.slice(0, 8)}`;

    const html = `
      <h2>${subject}</h2>
      <p>Hi ${userName},</p>
      <p>${this.getMessageBody(type, orderId, totalPrice)}</p>
      <p>Thank you for shopping with Prodigy Glasses!</p>
    `;

    try {
      await this.transporter.sendMail({
        from: '"Prodigy Glasses" <noreply@prodigy-glasses.local>',
        to: userEmail,
        subject,
        html,
      });
      this.logger.log(`Email sent: ${type} for order ${orderId} to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${type} for order ${orderId}`, error);
      throw error; // BullMQ will retry
    }
  }

  private getMessageBody(type: string, orderId: string, totalPrice: number): string {
    const formattedPrice = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(totalPrice);
    switch (type) {
      case 'order-confirmed':
        return `Your order <strong>#${orderId.slice(0, 8)}</strong> has been confirmed. Total: ${formattedPrice}.`;
      case 'order-paid':
        return `We've received your payment for order <strong>#${orderId.slice(0, 8)}</strong>. Total: ${formattedPrice}.`;
      case 'order-delivered':
        return `Your order <strong>#${orderId.slice(0, 8)}</strong> has been delivered. Enjoy your new eyewear!`;
      default:
        return `Your order <strong>#${orderId.slice(0, 8)}</strong> has been updated.`;
    }
  }
}
