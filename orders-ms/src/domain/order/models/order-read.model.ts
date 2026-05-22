/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-21
 */
import { OrderStatus } from '../enums/order-status.enum';

export interface OrderReadModel {
  id:          number;
  productId:   number;
  quantity:    number;
  customerId:  number;
  totalAmount: number;
  status:      OrderStatus;
  notes:       string | null;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface PaginatedOrderReadModels {
  data:  OrderReadModel[];
  total: number;
  page:  number;
  limit: number;
}
