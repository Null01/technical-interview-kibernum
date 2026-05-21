import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp }  from '../helpers/app.factory';
import { truncateDatabase, getOutboxEvents } from '../helpers/database.helper';
import {
  buildCreateOrderPayload,
  CUSTOMER,
  PAGEABLE_COUNT,
} from '../helpers/order.factory';
import { OrderStatus } from '@domain/order/enums/order-status.enum';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers locales
// ─────────────────────────────────────────────────────────────────────────────

/** Crea una orden via HTTP y devuelve el body de la respuesta. */
async function createOrder(
  app: INestApplication,
  overrides: Parameters<typeof buildCreateOrderPayload>[0] = {},
) {
  const res = await request(app.getHttpServer())
    .post('/orders')
    .send(buildCreateOrderPayload(overrides))
    .expect(201);
  return res.body as Record<string, unknown>;
}

describe('Orders API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  POST /orders — Crear orden
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /orders', () => {
    it('retorna 201 con la orden creada en estado pending', async () => {
      const payload = buildCreateOrderPayload({ productId: 1, quantity: 10 });

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        productId:   payload.productId,
        quantity:    payload.quantity,
        customerId:  payload.customerId,
        totalAmount: payload.totalAmount,
        status:      OrderStatus.PENDING,
      });
      expect(typeof response.body.id).toBe('number');
      expect(response.body.createdAt).toBeDefined();
    });

    it('escribe exactamente un evento order.created en el outbox', async () => {
      const payload = buildCreateOrderPayload({ productId: 2, quantity: 3 });
      const order   = await createOrder(app, { productId: 2, quantity: 3 });

      const events = await getOutboxEvents(app, 'order.created');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'order',
        aggregate_id:   order.id,
        event_type:     'order.created',
        status:         'pending',
      });
      expect(events[0].payload).toMatchObject({
        orderId:    order.id,
        productId:  payload.productId,
        quantity:   payload.quantity,
        customerId: payload.customerId,
      });
    });

    it('retorna 400 cuando faltan campos obligatorios', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ productId: 1 })
        .expect(400);
    });

    it('retorna 400 cuando quantity es 0', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send(buildCreateOrderPayload({ quantity: 0 }))
        .expect(400);
    });

    it('retorna 400 cuando quantity es negativa', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send(buildCreateOrderPayload({ quantity: -1 }))
        .expect(400);
    });

    it('retorna 400 cuando productId no es entero', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send(buildCreateOrderPayload({ productId: 1.5 }))
        .expect(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  GET /orders — Listar órdenes
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /orders', () => {
    it('retorna lista paginada con metadatos correctos', async () => {
      await createOrder(app, { customerId: CUSTOMER.ALICE });
      await createOrder(app, { customerId: CUSTOMER.BOB });

      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toMatchObject({
        total: 2,
        page:  1,
        limit: 20,
      });
      expect(response.body.data).toHaveLength(2);
    });

    it('retorna lista vacía cuando no hay órdenes', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toMatchObject({ total: 0, data: [] });
    });

    it('filtra por customerId', async () => {
      await createOrder(app, { customerId: CUSTOMER.ALICE });
      await createOrder(app, { customerId: CUSTOMER.BOB });
      await createOrder(app, { customerId: CUSTOMER.ALICE });

      const response = await request(app.getHttpServer())
        .get(`/orders?customerId=${CUSTOMER.ALICE}`)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(
        (response.body.data as { customerId: number }[]).every(
          o => o.customerId === CUSTOMER.ALICE,
        ),
      ).toBe(true);
    });

    it('filtra por status=pending', async () => {
      await createOrder(app);

      const response = await request(app.getHttpServer())
        .get('/orders?status=pending')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(
        (response.body.data as { status: string }[]).every(
          o => o.status === OrderStatus.PENDING,
        ),
      ).toBe(true);
    });

    it('filtra por productId', async () => {
      await createOrder(app, { productId: 10 });
      await createOrder(app, { productId: 20 });

      const response = await request(app.getHttpServer())
        .get('/orders?productId=10')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].productId).toBe(10);
    });

    it('pagina correctamente — page 1 y page 2', async () => {
      for (let i = 0; i < PAGEABLE_COUNT; i++) {
        await createOrder(app);
      }

      const page1 = await request(app.getHttpServer())
        .get('/orders?page=1&limit=2')
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/orders?page=2&limit=2')
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page2.body.data).toHaveLength(2);
      expect(page1.body.total).toBe(PAGEABLE_COUNT);

      const idsPage1 = (page1.body.data as { id: number }[]).map(o => o.id);
      const idsPage2 = (page2.body.data as { id: number }[]).map(o => o.id);
      expect(idsPage1.some(id => idsPage2.includes(id))).toBe(false);
    });

    it('ordena por totalAmount ASC', async () => {
      await createOrder(app, { totalAmount: 5000 });
      await createOrder(app, { totalAmount: 1000 });
      await createOrder(app, { totalAmount: 3000 });

      const response = await request(app.getHttpServer())
        .get('/orders?sortBy=totalAmount&sortDir=ASC')
        .expect(200);

      const amounts = (response.body.data as { totalAmount: number }[]).map(
        o => Number(o.totalAmount),
      );
      const sorted = [...amounts].sort((a, b) => a - b);
      expect(amounts).toEqual(sorted);
    });

    it('retorna 400 con un status inválido', async () => {
      await request(app.getHttpServer())
        .get('/orders?status=inexistente')
        .expect(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  GET /orders/:id — Obtener por ID
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /orders/:id', () => {
    it('retorna la orden cuando existe', async () => {
      const created = await createOrder(app, { productId: 5, quantity: 2 });

      const response = await request(app.getHttpServer())
        .get(`/orders/${created.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id:        created.id,
        productId: 5,
        quantity:  2,
        status:    OrderStatus.PENDING,
      });
    });

    it('retorna 404 cuando la orden no existe', async () => {
      await request(app.getHttpServer())
        .get('/orders/99999')
        .expect(404);
    });

    it('retorna 400 cuando el id no es un número', async () => {
      await request(app.getHttpServer())
        .get('/orders/abc')
        .expect(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  //  PATCH /orders/:id/status — Cambiar estado
  // ───────────────────────────────────────────────────────────────────────────

  describe('PATCH /orders/:id/status', () => {
    it('transaccion de pending a confirmed y escribe evento order.confirmed', async () => {
      const order = await createOrder(app);

      const response = await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CONFIRMED);

      const events = await getOutboxEvents(app, 'order.confirmed');
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({ orderId: order.id });
    });

    it('transaccion de pending a cancelled y escribe evento order.cancelled', async () => {
      const order = await createOrder(app);

      const response = await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.CANCELLED })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CANCELLED);

      const events = await getOutboxEvents(app, 'order.cancelled');
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({ orderId: order.id });
    });

    it('transaccion de confirmed a paid sin generar evento outbox adicional', async () => {
      const order = await createOrder(app);
      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.PAID })
        .expect(200);

      // Solo los eventos ya creados — sin evento extra para PAID
      const allEvents = await getOutboxEvents(app);
      const eventTypes = allEvents.map(e => e.event_type);
      expect(eventTypes).toContain('order.created');
      expect(eventTypes).toContain('order.confirmed');
      expect(eventTypes).not.toContain('order.paid');
    });

    it('retorna 422 en transición inválida (pending → paid)', async () => {
      const order = await createOrder(app);

      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.PAID })
        .expect(422);
    });

    it('retorna 422 en transición inválida desde estado terminal (cancelled → pending)', async () => {
      const order = await createOrder(app);
      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.CANCELLED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.PENDING })
        .expect(422);
    });

    it('retorna 404 cuando la orden no existe', async () => {
      await request(app.getHttpServer())
        .patch('/orders/99999/status')
        .send({ status: OrderStatus.CONFIRMED })
        .expect(404);
    });

    it('retorna 400 con un status inválido en el body', async () => {
      const order = await createOrder(app);

      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .send({ status: 'estado_invalido' })
        .expect(400);
    });
  });
});
