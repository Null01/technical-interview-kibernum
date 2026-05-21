import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentModel {
  id:            number;
  orderId:       number;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  transactionId: string | null;
  failureReason: string | null;
  createdAt:     Date;
  updatedAt:     Date;
}
