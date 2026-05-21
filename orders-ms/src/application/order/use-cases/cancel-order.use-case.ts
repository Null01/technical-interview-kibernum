/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@domain/order/ports/order.repository.port';
import type { OrderRepositoryPort } from '@domain/order/ports/order.repository.port';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox.repository.port';
import type { OutboxRepositoryPort } from '@domain/shared/ports/outbox.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import type { UnitOfWorkPort } from '@domain/shared/ports/unit-of-work.port';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { OrderCancelledEventPayload } from '../events/order-cancelled.event-payload';

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(orderId: number): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return;

    await this.unitOfWork.withTransaction(async () => {
      await this.orderRepository.updateStatus(orderId, OrderStatus.CANCELLED);

      const payload: OrderCancelledEventPayload = {
        orderId,
        productId: order.productId,
        quantity:  order.quantity,
      };

      await this.outboxRepository.save({
        aggregateType: 'order',
        aggregateId:   orderId,
        eventType:     process.env.KAFKA_TOPIC_ORDER_CANCELLED ?? 'order.cancelled',
        payload,
      });
    });
  }
}
