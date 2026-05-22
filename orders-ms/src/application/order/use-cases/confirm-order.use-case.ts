/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_COMMAND_REPOSITORY } from '@domain/order/ports/order-command.repository.port';
import type { OrderCommandRepositoryPort } from '@domain/order/ports/order-command.repository.port';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox.repository.port';
import type { OutboxRepositoryPort } from '@domain/shared/ports/outbox.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import type { UnitOfWorkPort } from '@domain/shared/ports/unit-of-work.port';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { OrderConfirmedEventPayload } from '../events/order-confirmed.event-payload';

@Injectable()
export class ConfirmOrderUseCase {
  constructor(
    @Inject(ORDER_COMMAND_REPOSITORY)
    private readonly orderRepository: OrderCommandRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(orderId: number): Promise<void> {
    await this.unitOfWork.withTransaction(async () => {
      const order = await this.orderRepository.updateStatus(orderId, OrderStatus.CONFIRMED);
      if (!order) return;

      const payload: OrderConfirmedEventPayload = {
        orderId:     order.id,
        productId:   order.productId,
        quantity:    order.quantity,
        totalAmount: order.totalAmount,
        customerId:  order.customerId,
      };

      await this.outboxRepository.save({
        aggregateType: 'order',
        aggregateId:   order.id,
        eventType:     process.env.KAFKA_TOPIC_ORDER_CONFIRMED ?? 'order.confirmed',
        payload,
      });
    });
  }
}
