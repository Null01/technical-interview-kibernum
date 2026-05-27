/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-21
 */
import { OrderModel } from '../models/order.model';
import { OrderStatus } from '../enums/order-status.enum';

export const ORDER_COMMAND_REPOSITORY = 'ORDER_COMMAND_REPOSITORY';

export interface OrderCommandRepositoryPort {
  save(order: Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderModel>;
  updateStatus(id: number, status: OrderStatus, notes?: string): Promise<OrderModel | null>;
}
