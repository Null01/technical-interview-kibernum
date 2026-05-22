/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_COMMAND_REPOSITORY } from '@domain/order/ports/order-command.repository.port';
import type { OrderCommandRepositoryPort } from '@domain/order/ports/order-command.repository.port';
import { OrderStatus } from '@domain/order/enums/order-status.enum';

@Injectable()
export class CompleteOrderUseCase {
  constructor(
    @Inject(ORDER_COMMAND_REPOSITORY)
    private readonly orderRepository: OrderCommandRepositoryPort,
  ) {}

  execute(orderId: number): Promise<void> {
    return this.orderRepository.updateStatus(orderId, OrderStatus.PAID).then(() => undefined);
  }
}
