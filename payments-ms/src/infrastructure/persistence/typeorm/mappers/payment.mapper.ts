/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { PaymentModel } from '@domain/payment/models/payment.model';
import { SavePaymentPayload } from '@domain/payment/ports/payment.repository.port';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';

@Injectable()
export class PaymentMapper {
  toDomain(entity: PaymentOrmEntity): PaymentModel {
    return {
      id:            entity.id,
      orderId:       entity.orderId,
      amount:        Number(entity.amount),
      currency:      entity.currency,
      status:        entity.status,
      transactionId: entity.transactionId,
      failureReason: entity.failureReason,
      createdAt:     entity.createdAt,
      updatedAt:     entity.updatedAt,
    };
  }

  toOrm(payload: SavePaymentPayload): Partial<PaymentOrmEntity> {
    return {
      orderId:       payload.orderId,
      amount:        payload.amount,
      currency:      payload.currency,
      status:        payload.status,
      transactionId: payload.transactionId,
      failureReason: payload.failureReason,
    };
  }
}
