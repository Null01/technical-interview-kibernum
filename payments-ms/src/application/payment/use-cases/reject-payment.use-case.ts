/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_REPOSITORY } from '@domain/payment/ports/payment.repository.port';
import type { PaymentRepositoryPort } from '@domain/payment/ports/payment.repository.port';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox.repository.port';
import type { OutboxRepositoryPort } from '@domain/shared/ports/outbox.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import type { UnitOfWorkPort } from '@domain/shared/ports/unit-of-work.port';
import { PaymentStatus } from '@domain/payment/enums/payment-status.enum';
import { PaymentModel } from '@domain/payment/models/payment.model';
import { RejectPaymentCommand } from '../commands/reject-payment.command';
import { PaymentFailedEventPayload } from '../events/payment-failed.event-payload';
import { AppLoggerService } from '../../../infrastructure/common/logging/app-logger.service';

/**
 * Registra el rechazo de un pago para una orden.
 *
 * Idempotencia: si la orden ya tiene un pago registrado (aprobado o rechazado),
 * retorna el registro existente sin crear duplicados ni eventos adicionales.
 */
@Injectable()
export class RejectPaymentUseCase {
  private readonly logger = new AppLoggerService(RejectPaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute (cmd: RejectPaymentCommand): Promise<PaymentModel> {
    const existing = await this.paymentRepository.findByOrderId(cmd.orderId);
    if (existing) {
      this.logger.log(
        `Pago para orden ${cmd.orderId} ya registrado (id=${existing.id}) — operación idempotente`,
      );
      return existing;
    }

    let payment!: PaymentModel;

    await this.unitOfWork.withTransaction(async () => {
      payment = await this.paymentRepository.save({
        orderId:       cmd.orderId,
        amount:        cmd.amount,
        currency:      cmd.currency ?? 'COP',
        status:        PaymentStatus.REJECTED,
        transactionId: null,
        failureReason: cmd.failureReason,
      });

      const payload: PaymentFailedEventPayload = {
        paymentId: payment.id,
        orderId:   payment.orderId,
        productId: cmd.productId,
        quantity:  cmd.quantity,
        status:    payment.status,
        reason:    payment.failureReason,
      };

      await this.outboxRepository.save({
        aggregateType: 'payment',
        aggregateId:   payment.id,
        eventType:     process.env.KAFKA_TOPIC_PAYMENT_FAILED ?? 'payment.failed',
        payload,
      });
    });

    this.logger.warn(`Pago rechazado: id=${payment.id} orden=${payment.orderId} motivo="${payment.failureReason}"`);
    return payment;
  }
}
