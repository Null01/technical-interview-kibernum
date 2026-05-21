export interface RejectPaymentCommand {
  orderId:       number;
  productId:     number;
  quantity:      number;
  amount:        number;
  currency?:     string;
  failureReason: string;
}
