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
import { OrderModel } from '@domain/order/models/order.model';
import { CreateOrderCommand } from '../commands/create-order.command';
import { OrderCreatedEventPayload } from '../events/order-created.event-payload';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(cmd: CreateOrderCommand): Promise<OrderModel> {
    let order!: OrderModel;

    await this.unitOfWork.withTransaction(async () => {
      order = await this.orderRepository.save({ ...cmd, status: OrderStatus.PENDING });

      const payload: OrderCreatedEventPayload = {
        orderId:     order.id,
        productId:   order.productId,
        quantity:    order.quantity,
        customerId:  order.customerId,
        totalAmount: order.totalAmount,
      };

      await this.outboxRepository.save({
        aggregateType: 'order',
        aggregateId:   order.id,
        eventType:     process.env.KAFKA_TOPIC_ORDER_CREATED ?? 'order.created',
        payload,
      });
    });

    return order;
  }
}
