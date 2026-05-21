export interface ProcessPaymentCommand {
  orderId:       number;
  amount:        number;
  currency?:     string;
  transactionId: string;
}
