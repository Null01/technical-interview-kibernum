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
import { ProcessPaymentCommand } from '../commands/process-payment.command';
import { PaymentProcessedEventPayload } from '../events/payment-processed.event-payload';
import { AppLoggerService } from '../../../infrastructure/common/logging/app-logger.service';

/**
 * Registra un pago aprobado para una orden.
 *
 * Idempotencia: si ya existe un pago para la orden, lo retorna tal cual sin
 * crear un registro duplicado ni escribir un evento adicional en el outbox.
 * Esto garantiza que re-entregas del evento `order.confirmed` no generen
 * cobros dobles.
 */
@Injectable()
export class ProcessPaymentUseCase {
  private readonly logger = new AppLoggerService(ProcessPaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute (cmd: ProcessPaymentCommand): Promise<PaymentModel> {
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
        status:        PaymentStatus.APPROVED,
        transactionId: cmd.transactionId,
        failureReason: null,
      });

      const payload: PaymentProcessedEventPayload = {
        paymentId:     payment.id,
        orderId:       payment.orderId,
        status:        payment.status,
        transactionId: payment.transactionId,
      };

      await this.outboxRepository.save({
        aggregateType: 'payment',
        aggregateId:   payment.id,
        eventType:     process.env.KAFKA_TOPIC_PAYMENT_PROCESSED ?? 'payment.processed',
        payload,
      });
    });

    this.logger.log(`Pago aprobado: id=${payment.id} orden=${payment.orderId} monto=${payment.amount}`);
    return payment;
  }
}
