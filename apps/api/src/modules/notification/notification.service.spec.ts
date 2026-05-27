import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { NotificationService } from './notification.service';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService, { provide: getQueueToken('email'), useValue: mockQueue }],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('enqueueOrderConfirmed', () => {
    it('should add job to email queue with correct type and retry config', async () => {
      await service.enqueueOrderConfirmed({
        orderId: 'order-1',
        userEmail: 'test@test.com',
        userName: 'Test',
        totalPrice: 100000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'email:order-confirmed',
        expect.objectContaining({ type: 'order-confirmed', orderId: 'order-1' }),
        expect.objectContaining({ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }),
      );
    });
  });

  describe('enqueueOrderPaid', () => {
    it('should add job with order-paid type', async () => {
      await service.enqueueOrderPaid({
        orderId: 'order-2',
        userEmail: 'user@test.com',
        userName: 'User',
        totalPrice: 200000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'email:order-paid',
        expect.objectContaining({ type: 'order-paid', orderId: 'order-2' }),
        expect.any(Object),
      );
    });
  });

  describe('enqueueOrderDelivered', () => {
    it('should add job with order-delivered type', async () => {
      await service.enqueueOrderDelivered({
        orderId: 'order-3',
        userEmail: 'delivered@test.com',
        userName: 'Delivered',
        totalPrice: 300000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'email:order-delivered',
        expect.objectContaining({ type: 'order-delivered', orderId: 'order-3' }),
        expect.any(Object),
      );
    });
  });
});
