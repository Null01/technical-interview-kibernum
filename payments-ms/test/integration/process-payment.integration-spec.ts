import { INestApplication } from '@nestjs/common';
import { ProcessPaymentUseCase } from '@application/payment/use-cases/process-payment.use-case';
import { PaymentStatus } from '@domain/payment/enums/payment-status.enum';
import { createTestingApp } from '../helpers/app.factory';
import {
  truncateDatabase,
  getOutboxEvents,
  countOutboxEvents,
} from '../helpers/database.helper';
import { buildProcessCommand } from '../helpers/payment.factory';

describe('ProcessPaymentUseCase (integration)', () => {
  let app:            INestApplication;
  let processPayment: ProcessPaymentUseCase;

  beforeAll(async () => {
    app            = await createTestingApp();
    processPayment = app.get(ProcessPaymentUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── Pago aprobado ───────────────────────────────────────────────────────────

  describe('cuando el comando es válido', () => {
    it('retorna el pago con status APPROVED e id asignado', async () => {
      const cmd = buildProcessCommand({ orderId: 1001, amount: 150_000 });

      const payment = await processPayment.execute(cmd);

      expect(payment.id).toBeGreaterThan(0);
      expect(payment.status).toBe(PaymentStatus.APPROVED);
      expect(payment.orderId).toBe(cmd.orderId);
      expect(payment.amount).toBe(cmd.amount);
      expect(payment.transactionId).toBe(cmd.transactionId);
    });

    it('persiste el pago con currency COP por defecto', async () => {
      const cmd = buildProcessCommand({ orderId: 1002, currency: undefined });

      const payment = await processPayment.execute(cmd);

      expect(payment.currency).toBe('COP');
    });

    it('asigna timestamps de creación y actualización', async () => {
      const payment = await processPayment.execute(buildProcessCommand({ orderId: 1003 }));

      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });

    it('failureReason es null en pago aprobado', async () => {
      const payment = await processPayment.execute(buildProcessCommand({ orderId: 1004 }));

      expect(payment.failureReason).toBeNull();
    });
  });

  // ─── Outbox transaccional ────────────────────────────────────────────────────

  describe('garantía transaccional del outbox', () => {
    it('escribe exactamente un evento payment.processed en el outbox', async () => {
      const cmd = buildProcessCommand({ orderId: 2001 });

      const payment = await processPayment.execute(cmd);

      const events = await getOutboxEvents(app, 'payment.processed');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'payment',
        aggregate_id:   payment.id,
        event_type:     'payment.processed',
        status:         'pending',
        retries:        0,
      });
    });

    it('el payload del evento contiene paymentId, orderId, status y transactionId', async () => {
      const cmd = buildProcessCommand({ orderId: 2002 });

      const payment = await processPayment.execute(cmd);

      const [event] = await getOutboxEvents(app, 'payment.processed');
      expect(event.payload).toMatchObject({
        paymentId:     payment.id,
        orderId:       cmd.orderId,
        status:        PaymentStatus.APPROVED,
        transactionId: cmd.transactionId,
      });
    });

    it('acumula un evento por cada pago procesado', async () => {
      await processPayment.execute(buildProcessCommand({ orderId: 3001 }));
      await processPayment.execute(buildProcessCommand({ orderId: 3002 }));
      await processPayment.execute(buildProcessCommand({ orderId: 3003 }));

      expect(await countOutboxEvents(app, 'payment.processed')).toBe(3);
    });

    it('no escribe eventos de otros tipos al procesar un pago', async () => {
      await processPayment.execute(buildProcessCommand({ orderId: 3004 }));

      const all = await getOutboxEvents(app);
      expect(all.map(e => e.event_type)).toEqual(['payment.processed']);
    });
  });

  // ─── Idempotencia ────────────────────────────────────────────────────────────

  describe('idempotencia', () => {
    it('retorna el pago existente sin crear duplicado en segunda llamada', async () => {
      const cmd = buildProcessCommand({ orderId: 4001 });

      const first  = await processPayment.execute(cmd);
      const second = await processPayment.execute(cmd);

      expect(second.id).toBe(first.id);
      expect(await countOutboxEvents(app, 'payment.processed')).toBe(1);
    });
  });
});
