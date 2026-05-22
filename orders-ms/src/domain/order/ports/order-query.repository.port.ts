/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-21
 */
import { OrderStatus } from '../enums/order-status.enum';
import { OrderReadModel, PaginatedOrderReadModels } from '../models/order-read.model';

export type { OrderReadModel, PaginatedOrderReadModels };

export const ORDER_QUERY_REPOSITORY = 'ORDER_QUERY_REPOSITORY';

export interface FindOrdersQuery {
  status?:    OrderStatus;
  customerId?: number;
  productId?:  number;
  sortBy?:     'createdAt' | 'updatedAt' | 'totalAmount';
  sortDir?:    'ASC' | 'DESC';
  page?:       number;
  limit?:      number;
}

export interface OrderQueryRepositoryPort {
  findMany(query: FindOrdersQuery): Promise<PaginatedOrderReadModels>;
  findById(id: number): Promise<OrderReadModel | null>;
}
