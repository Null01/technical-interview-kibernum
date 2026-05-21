export interface RejectPaymentCommand {
  orderId:       number;
  amount:        number;
  currency?:     string;
  failureReason: string;
}
