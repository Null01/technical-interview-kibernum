import { INestApplication } from '@nestjs/common';
import { UpdateOrderStatusUseCase } from '@application/order/use-cases/update-order-status.use-case';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { OrderNotFoundException } from '@domain/order/exceptions/order-not-found.exception';
import { InvalidOrderStatusTransitionException } from '@domain/order/exceptions/invalid-order-status-transition.exception';
import { createTestingApp } from '../helpers/app.factory';
import { truncateDatabase, getOutboxEvents, countOutboxEvents } from '../helpers/database.helper';
import { buildCreateOrderPayload } from '../helpers/order.factory';

describe('UpdateOrderStatusUseCase (integration)', () => {
  let app:               INestApplication;
  let updateOrderStatus: UpdateOrderStatusUseCase;
  let createOrder:       CreateOrderUseCase;

  beforeAll(async () => {
    app               = await createTestingApp();
    updateOrderStatus = app.get(UpdateOrderStatusUseCase);
    createOrder       = app.get(CreateOrderUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── Máquina de estados ─────────────────────────────────────────────────────

  describe('máquina de estados', () => {
    it('transiciona de PENDING a CONFIRMED', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      const updated = await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      expect(updated.status).toBe(OrderStatus.CONFIRMED);
      expect(updated.id).toBe(order.id);
    });

    it('transiciona de PENDING a CANCELLED', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      const updated = await updateOrderStatus.execute(order.id, OrderStatus.CANCELLED);

      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });

    it('transiciona de CONFIRMED a PAID', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      const updated = await updateOrderStatus.execute(order.id, OrderStatus.PAID);

      expect(updated.status).toBe(OrderStatus.PAID);
    });

    it('transiciona de CONFIRMED a CANCELLED', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      const updated = await updateOrderStatus.execute(order.id, OrderStatus.CANCELLED);

      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });
  });

  // ─── Transiciones inválidas ─────────────────────────────────────────────────

  describe('transiciones inválidas', () => {
    it('lanza InvalidOrderStatusTransitionException al ir de PENDING a PAID', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await expect(
        updateOrderStatus.execute(order.id, OrderStatus.PAID),
      ).rejects.toThrow(InvalidOrderStatusTransitionException);
    });

    it('lanza InvalidOrderStatusTransitionException al reintentar desde PAID (estado terminal)', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);
      await updateOrderStatus.execute(order.id, OrderStatus.PAID);

      await expect(
        updateOrderStatus.execute(order.id, OrderStatus.CANCELLED),
      ).rejects.toThrow(InvalidOrderStatusTransitionException);
    });

    it('lanza InvalidOrderStatusTransitionException al reintentar desde CANCELLED (estado terminal)', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CANCELLED);

      await expect(
        updateOrderStatus.execute(order.id, OrderStatus.PENDING),
      ).rejects.toThrow(InvalidOrderStatusTransitionException);
    });

    it('lanza OrderNotFoundException cuando la orden no existe', async () => {
      await expect(
        updateOrderStatus.execute(999999, OrderStatus.CONFIRMED),
      ).rejects.toThrow(OrderNotFoundException);
    });
  });

  // ─── Outbox transaccional ───────────────────────────────────────────────────

  describe('outbox transaccional', () => {
    it('escribe evento order.confirmed al confirmar la orden', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      const events = await getOutboxEvents(app, 'order.confirmed');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'order',
        aggregate_id:   order.id,
        event_type:     'order.confirmed',
        status:         'pending',
      });
      expect(events[0].payload).toMatchObject({
        orderId:    order.id,
        productId:  order.productId,
        quantity:   order.quantity,
        customerId: order.customerId,
      });
    });

    it('escribe evento order.cancelled al cancelar la orden', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await updateOrderStatus.execute(order.id, OrderStatus.CANCELLED);

      const events = await getOutboxEvents(app, 'order.cancelled');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'order',
        aggregate_id:   order.id,
        event_type:     'order.cancelled',
        status:         'pending',
      });
      expect(events[0].payload).toMatchObject({
        orderId:   order.id,
        productId: order.productId,
        quantity:  order.quantity,
      });
    });

    it('NO escribe evento outbox al transicionar a PAID', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);
      await updateOrderStatus.execute(order.id, OrderStatus.PAID);

      const allEvents  = await getOutboxEvents(app);
      const eventTypes = allEvents.map(e => e.event_type);

      expect(eventTypes).not.toContain('order.paid');
      expect(eventTypes).toContain('order.created');
      expect(eventTypes).toContain('order.confirmed');
    });

    it('acumula eventos correctamente en el flujo completo pending → confirmed → paid', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);
      await updateOrderStatus.execute(order.id, OrderStatus.PAID);

      expect(await countOutboxEvents(app, 'order.created')).toBe(1);
      expect(await countOutboxEvents(app, 'order.confirmed')).toBe(1);
    });

    it('NO persiste el cambio de estado cuando la transición es inválida', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await expect(
        updateOrderStatus.execute(order.id, OrderStatus.PAID),
      ).rejects.toThrow(InvalidOrderStatusTransitionException);

      // El estado no debería haber cambiado
      const findOrder = app.get(FindOrderUseCase);
      const unchanged = await findOrder.findById(order.id);

      expect(unchanged.status).toBe(OrderStatus.PENDING);
    });
  });
});
