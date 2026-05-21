import { PaymentModel } from '../models/payment.model';
import { PaymentStatus } from '../enums/payment-status.enum';

export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';

export interface SavePaymentPayload {
  orderId:       number;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  transactionId: string | null;
  failureReason: string | null;
}

export interface PaymentRepositoryPort {
  save(payload: SavePaymentPayload): Promise<PaymentModel>;
  findById(id: number): Promise<PaymentModel | null>;
  findByOrderId(orderId: number): Promise<PaymentModel | null>;
  findAll(): Promise<PaymentModel[]>;
}
