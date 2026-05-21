import { INestApplication } from '@nestjs/common';
import { RejectPaymentUseCase }  from '@application/payment/use-cases/reject-payment.use-case';
import { ProcessPaymentUseCase } from '@application/payment/use-cases/process-payment.use-case';
import { PaymentStatus } from '@domain/payment/enums/payment-status.enum';
import { createTestingApp } from '../helpers/app.factory';
import {
  truncateDatabase,
  getOutboxEvents,
  countOutboxEvents,
} from '../helpers/database.helper';
import { buildRejectCommand, buildProcessCommand } from '../helpers/payment.factory';

describe('RejectPaymentUseCase (integration)', () => {
  let app:            INestApplication;
  let rejectPayment:  RejectPaymentUseCase;
  let processPayment: ProcessPaymentUseCase;

  beforeAll(async () => {
    app            = await createTestingApp();
    rejectPayment  = app.get(RejectPaymentUseCase);
    processPayment = app.get(ProcessPaymentUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── Pago rechazado ──────────────────────────────────────────────────────────

  describe('cuando el comando es válido', () => {
    it('retorna el pago con status REJECTED e id asignado', async () => {
      const cmd = buildRejectCommand({ orderId: 1001, amount: 600_000 });

      const payment = await rejectPayment.execute(cmd);

      expect(payment.id).toBeGreaterThan(0);
      expect(payment.status).toBe(PaymentStatus.REJECTED);
      expect(payment.orderId).toBe(cmd.orderId);
      expect(payment.amount).toBe(cmd.amount);
    });

    it('persiste failureReason en el pago rechazado', async () => {
      const reason = 'Monto supera límite de la pasarela';
      const payment = await rejectPayment.execute(
        buildRejectCommand({ orderId: 1002, failureReason: reason }),
      );

      expect(payment.failureReason).toBe(reason);
    });

    it('transactionId es null en pago rechazado', async () => {
      const payment = await rejectPayment.execute(buildRejectCommand({ orderId: 1003 }));

      expect(payment.transactionId).toBeNull();
    });

    it('asigna timestamps de creación y actualización', async () => {
      const payment = await rejectPayment.execute(buildRejectCommand({ orderId: 1004 }));

      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Outbox transaccional ────────────────────────────────────────────────────

  describe('garantía transaccional del outbox', () => {
    it('escribe exactamente un evento payment.failed en el outbox', async () => {
      const cmd = buildRejectCommand({ orderId: 2001, productId: 1, quantity: 5 });

      const payment = await rejectPayment.execute(cmd);

      const events = await getOutboxEvents(app, 'payment.failed');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'payment',
        aggregate_id:   payment.id,
        event_type:     'payment.failed',
        status:         'pending',
        retries:        0,
      });
    });

    it('el payload incluye paymentId, orderId, productId, quantity, status y reason', async () => {
      const cmd = buildRejectCommand({ orderId: 2002, productId: 3, quantity: 7 });

      const payment = await rejectPayment.execute(cmd);

      const [event] = await getOutboxEvents(app, 'payment.failed');
      expect(event.payload).toMatchObject({
        paymentId: payment.id,
        orderId:   cmd.orderId,
        productId: cmd.productId,
        quantity:  cmd.quantity,
        status:    PaymentStatus.REJECTED,
        reason:    cmd.failureReason,
      });
    });

    it('acumula un evento por cada rechazo independiente', async () => {
      await rejectPayment.execute(buildRejectCommand({ orderId: 3001 }));
      await rejectPayment.execute(buildRejectCommand({ orderId: 3002 }));

      expect(await countOutboxEvents(app, 'payment.failed')).toBe(2);
    });

    it('no escribe eventos de otros tipos al rechazar un pago', async () => {
      await rejectPayment.execute(buildRejectCommand({ orderId: 3003 }));

      const all = await getOutboxEvents(app);
      expect(all.map(e => e.event_type)).toEqual(['payment.failed']);
    });
  });

  // ─── Idempotencia ────────────────────────────────────────────────────────────

  describe('idempotencia', () => {
    it('retorna el pago existente en segunda llamada sin crear duplicado', async () => {
      const cmd = buildRejectCommand({ orderId: 4001 });

      const first  = await rejectPayment.execute(cmd);
      const second = await rejectPayment.execute(cmd);

      expect(second.id).toBe(first.id);
      expect(await countOutboxEvents(app, 'payment.failed')).toBe(1);
    });

    it('es idempotente aunque el primer registro sea approved', async () => {
      const processCmd = buildProcessCommand({ orderId: 4002, amount: 150_000 });
      const rejectCmd  = buildRejectCommand({ orderId: 4002 });

      const approved = await processPayment.execute(processCmd);
      const result   = await rejectPayment.execute(rejectCmd);

      // Devuelve el pago approved original sin sobrescribirlo
      expect(result.id).toBe(approved.id);
      expect(result.status).toBe(PaymentStatus.APPROVED);
      expect(await countOutboxEvents(app, 'payment.failed')).toBe(0);
    });
  });
});
