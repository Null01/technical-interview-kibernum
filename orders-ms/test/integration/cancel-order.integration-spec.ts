import { INestApplication } from '@nestjs/common';
import { CancelOrderUseCase } from '@application/order/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { UpdateOrderStatusUseCase } from '@application/order/use-cases/update-order-status.use-case';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { createTestingApp } from '../helpers/app.factory';
import { truncateDatabase, getOutboxEvents, countOutboxEvents } from '../helpers/database.helper';
import { buildCreateOrderPayload } from '../helpers/order.factory';

describe('CancelOrderUseCase (integration)', () => {
  let app:               INestApplication;
  let cancelOrder:       CancelOrderUseCase;
  let createOrder:       CreateOrderUseCase;
  let findOrder:         FindOrderUseCase;
  let updateOrderStatus: UpdateOrderStatusUseCase;

  beforeAll(async () => {
    app               = await createTestingApp();
    cancelOrder       = app.get(CancelOrderUseCase);
    createOrder       = app.get(CreateOrderUseCase);
    findOrder         = app.get(FindOrderUseCase);
    updateOrderStatus = app.get(UpdateOrderStatusUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── Compensación exitosa ────────────────────────────────────────────────────

  describe('cuando la orden existe y está en PENDING', () => {
    it('transiciona la orden a CANCELLED', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await cancelOrder.execute(order.id);

      const updated = await findOrder.findById(order.id);
      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });

    it('escribe exactamente un evento order.cancelled en el outbox', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());

      await cancelOrder.execute(order.id);

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
  });

  describe('cuando la orden existe y está en CONFIRMED', () => {
    it('transiciona la orden a CANCELLED desde CONFIRMED (compensación post-pago fallido)', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      await cancelOrder.execute(order.id);

      const updated = await findOrder.findById(order.id);
      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });

    it('escribe evento order.cancelled en el outbox', async () => {
      const order = await createOrder.execute(buildCreateOrderPayload());
      await updateOrderStatus.execute(order.id, OrderStatus.CONFIRMED);

      await cancelOrder.execute(order.id);

      expect(await countOutboxEvents(app, 'order.cancelled')).toBe(1);
    });
  });

  // ─── No-op cuando la orden no existe ────────────────────────────────────────

  describe('cuando la orden no existe', () => {
    it('no lanza excepción — operación idempotente', async () => {
      await cancelOrder.execute(999999);
    });

    it('no escribe eventos en el outbox', async () => {
      await cancelOrder.execute(999999);

      expect(await countOutboxEvents(app, 'order.cancelled')).toBe(0);
    });
  });
});
