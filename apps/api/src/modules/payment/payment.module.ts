import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Order } from '../order/entities/order.entity';
import { ProcessedWebhookEvent } from './entities/processed-webhook-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, ProcessedWebhookEvent])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
