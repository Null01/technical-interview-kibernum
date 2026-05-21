import { INestApplication } from '@nestjs/common';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { createTestingApp } from '../helpers/app.factory';
import { truncateDatabase, getOutboxEvents, countOutboxEvents } from '../helpers/database.helper';
import { buildCreateOrderPayload, CUSTOMER } from '../helpers/order.factory';

describe('CreateOrderUseCase (integration)', () => {
  let app: INestApplication;
  let createOrder: CreateOrderUseCase;

  beforeAll(async () => {
    app         = await createTestingApp();
    createOrder = app.get(CreateOrderUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── Orden creada ───────────────────────────────────────────────────────────

  describe('cuando el comando es válido', () => {
    it('retorna la orden con estado PENDING y un id asignado', async () => {
      const command = buildCreateOrderPayload({ productId: 3, quantity: 10 });

      const order = await createOrder.execute(command);

      expect(order.id).toBeGreaterThan(0);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.productId).toBe(command.productId);
      expect(order.quantity).toBe(command.quantity);
      expect(order.customerId).toBe(command.customerId);
      expect(order.totalAmount).toBe(command.totalAmount);
    });

    it('persiste la orden en la base de datos', async () => {
      const command = buildCreateOrderPayload({ customerId: CUSTOMER.ALICE });

      const order = await createOrder.execute(command);

      // Segunda lectura para confirmar persistencia
      const findOrder = app.get(FindOrderUseCase);
      const persisted = await findOrder.findById(order.id);

      expect(persisted.id).toBe(order.id);
      expect(persisted.status).toBe(OrderStatus.PENDING);
    });

    it('asigna timestamps de creación y actualización', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Outbox transaccional ───────────────────────────────────────────────────

  describe('garantía transaccional del outbox', () => {
    it('escribe exactamente un evento order.created en el outbox', async () => {
      const command = buildCreateOrderPayload({ productId: 5 });

      const order = await createOrder.execute(command);

      const events = await getOutboxEvents(app, 'order.created');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'order',
        aggregate_id:   order.id,
        event_type:     'order.created',
        status:         'pending',
        retries:        0,
      });
    });

    it('el payload del evento contiene los datos completos de la orden', async () => {
      const command = buildCreateOrderPayload({
        productId:   7,
        quantity:    4,
        customerId:  CUSTOMER.BOB,
        totalAmount: 28000,
      });

      const order = await createOrder.execute(command);

      const [event] = await getOutboxEvents(app, 'order.created');
      expect(event.payload).toMatchObject({
        orderId:     order.id,
        productId:   command.productId,
        quantity:    command.quantity,
        customerId:  command.customerId,
        totalAmount: command.totalAmount,
      });
    });

    it('acumula eventos independientes por cada orden creada', async () => {
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.ALICE }));
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.BOB }));
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.CAROL }));

      const total = await countOutboxEvents(app, 'order.created');
      expect(total).toBe(3);
    });

    it('no escribe eventos de otros tipos al crear una orden', async () => {
      await createOrder.execute(buildCreateOrderPayload());

      const allEvents = await getOutboxEvents(app);
      const eventTypes = allEvents.map(e => e.event_type);

      expect(eventTypes).toEqual(['order.created']);
    });
  });
});
