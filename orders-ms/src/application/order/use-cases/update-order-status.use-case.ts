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
import { OrderModel } from '@domain/order/models/order.model';
import { OrderNotFoundException } from '@domain/order/exceptions/order-not-found.exception';
import { InvalidOrderStatusTransitionException } from '@domain/order/exceptions/invalid-order-status-transition.exception';
import { OrderConfirmedEventPayload } from '../events/order-confirmed.event-payload';
import { OrderCancelledEventPayload } from '../events/order-cancelled.event-payload';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID,      OrderStatus.CANCELLED],
  [OrderStatus.PAID]:      [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_COMMAND_REPOSITORY)
    private readonly orderRepository: OrderCommandRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(orderId: number, newStatus: OrderStatus): Promise<OrderModel> {
    const current = await this.orderRepository.findById(orderId);
    if (!current) throw new OrderNotFoundException(orderId);

    if (!ALLOWED_TRANSITIONS[current.status].includes(newStatus)) {
      throw new InvalidOrderStatusTransitionException(current.status, newStatus);
    }

    let updated!: OrderModel;

    await this.unitOfWork.withTransaction(async () => {
      updated = (await this.orderRepository.updateStatus(orderId, newStatus))!;

      if (newStatus === OrderStatus.CONFIRMED) {
        const payload: OrderConfirmedEventPayload = {
          orderId:     updated.id,
          productId:   updated.productId,
          quantity:    updated.quantity,
          totalAmount: updated.totalAmount,
          customerId:  updated.customerId,
        };
        await this.outboxRepository.save({
          aggregateType: 'order',
          aggregateId:   updated.id,
          eventType:     process.env.KAFKA_TOPIC_ORDER_CONFIRMED ?? 'order.confirmed',
          payload,
        });
      }

      if (newStatus === OrderStatus.CANCELLED) {
        const payload: OrderCancelledEventPayload = {
          orderId:   updated.id,
          productId: updated.productId,
          quantity:  updated.quantity,
        };
        await this.outboxRepository.save({
          aggregateType: 'order',
          aggregateId:   updated.id,
          eventType:     process.env.KAFKA_TOPIC_ORDER_CANCELLED ?? 'order.cancelled',
          payload,
        });
      }
    });

    return updated;
  }
}
