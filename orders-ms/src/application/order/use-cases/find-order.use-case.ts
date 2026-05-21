/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@domain/order/ports/order.repository.port';
import type { OrderRepositoryPort, FindOrdersQuery, PaginatedOrders } from '@domain/order/ports/order.repository.port';
import { OrderNotFoundException } from '@domain/order/exceptions/order-not-found.exception';
import { OrderModel } from '@domain/order/models/order.model';

@Injectable()
export class FindOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  findMany(query: FindOrdersQuery): Promise<PaginatedOrders> {
    return this.orderRepository.findMany(query);
  }

  async findById(id: number): Promise<OrderModel> {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }
}
