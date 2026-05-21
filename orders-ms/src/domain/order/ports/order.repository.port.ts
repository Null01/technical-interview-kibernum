import { OrderModel } from '../models/order.model';
import { OrderStatus } from '../enums/order-status.enum';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';

export interface FindOrdersQuery {
  status?: OrderStatus;
  customerId?: number;
  productId?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'totalAmount';
  sortDir?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  data: OrderModel[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderRepositoryPort {
  save(order: Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderModel>;
  findMany(query: FindOrdersQuery): Promise<PaginatedOrders>;
  findById(id: number): Promise<OrderModel | null>;
  updateStatus(id: number, status: OrderStatus): Promise<OrderModel | null>;
}
