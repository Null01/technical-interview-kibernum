import { OrderStatus } from '../enums/order-status.enum';

export interface OrderModel {
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
