import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProcessPaymentUseCase } from '@application/payment/use-cases/process-payment.use-case';
import { RejectPaymentUseCase }  from '@application/payment/use-cases/reject-payment.use-case';
import { createTestingApp } from '../helpers/app.factory';
import { truncateDatabase }  from '../helpers/database.helper';
import { buildProcessCommand, buildRejectCommand } from '../helpers/payment.factory';

describe('Payments API (e2e)', () => {
  let app:            INestApplication;
  let processPayment: ProcessPaymentUseCase;
  let rejectPayment:  RejectPaymentUseCase;

  beforeAll(async () => {
    app            = await createTestingApp();
    processPayment = app.get(ProcessPaymentUseCase);
    rejectPayment  = app.get(RejectPaymentUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── GET /payments ───────────────────────────────────────────────────────────

  describe('GET /payments', () => {
    it('retorna 200 con lista vacía cuando no hay pagos', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('retorna los pagos existentes', async () => {
      await processPayment.execute(buildProcessCommand({ orderId: 101 }));
      await rejectPayment.execute(buildRejectCommand({ orderId: 102 }));

      const response = await request(app.getHttpServer())
        .get('/payments')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('cada pago incluye id, orderId, amount, status y currency', async () => {
      await processPayment.execute(buildProcessCommand({ orderId: 201 }));

      const response = await request(app.getHttpServer())
        .get('/payments')
        .expect(200);

      const payment = response.body[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('orderId');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('currency');
    });
  });

  // ─── GET /payments/:id ───────────────────────────────────────────────────────

  describe('GET /payments/:id', () => {
    it('retorna 200 con el pago cuando existe', async () => {
      const created = await processPayment.execute(
        buildProcessCommand({ orderId: 301, amount: 150_000 }),
      );

      const response = await request(app.getHttpServer())
        .get(`/payments/${created.id}`)
        .expect(200);

      expect(response.body.id).toBe(created.id);
      expect(response.body.orderId).toBe(301);
      expect(response.body.status).toBe('approved');
    });

    it('retorna 404 cuando el pago no existe', async () => {
      await request(app.getHttpServer())
        .get('/payments/999999')
        .expect(404);
    });

    it('retorna 400 cuando el id no es un número', async () => {
      await request(app.getHttpServer())
        .get('/payments/abc')
        .expect(400);
    });

    it('retorna el pago rechazado con status rejected', async () => {
      const created = await rejectPayment.execute(
        buildRejectCommand({ orderId: 401 }),
      );

      const response = await request(app.getHttpServer())
        .get(`/payments/${created.id}`)
        .expect(200);

      expect(response.body.status).toBe('rejected');
      expect(response.body.failureReason).toBeDefined();
    });
  });

  // ─── GET /payments/order/:orderId ────────────────────────────────────────────

  describe('GET /payments/order/:orderId', () => {
    it('retorna 200 con el pago de la orden cuando existe', async () => {
      await processPayment.execute(buildProcessCommand({ orderId: 501 }));

      const response = await request(app.getHttpServer())
        .get('/payments/order/501')
        .expect(200);

      expect(response.body.orderId).toBe(501);
    });

    it('retorna 404 cuando no existe pago para la orden', async () => {
      await request(app.getHttpServer())
        .get('/payments/order/999999')
        .expect(404);
    });

    it('retorna 400 cuando orderId no es un número', async () => {
      await request(app.getHttpServer())
        .get('/payments/order/abc')
        .expect(400);
    });
  });
});
