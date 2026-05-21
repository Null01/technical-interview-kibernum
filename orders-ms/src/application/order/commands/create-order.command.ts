export interface CreateOrderCommand {
  productId: number;
  quantity: number;
  customerId: number;
  totalAmount: number;
}
