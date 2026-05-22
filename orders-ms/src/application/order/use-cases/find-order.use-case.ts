/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_QUERY_REPOSITORY } from '@domain/order/ports/order-query.repository.port';
import type { OrderQueryRepositoryPort, FindOrdersQuery } from '@domain/order/ports/order-query.repository.port';
import type { OrderReadModel, PaginatedOrderReadModels } from '@domain/order/models/order-read.model';
import { OrderNotFoundException } from '@domain/order/exceptions/order-not-found.exception';

@Injectable()
export class FindOrderUseCase {
  constructor(
    @Inject(ORDER_QUERY_REPOSITORY)
    private readonly orderRepository: OrderQueryRepositoryPort,
  ) {}

  findMany(query: FindOrdersQuery): Promise<PaginatedOrderReadModels> {
    return this.orderRepository.findMany(query);
  }

  async findById(id: number): Promise<OrderReadModel> {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }
}
