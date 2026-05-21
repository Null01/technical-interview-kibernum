import { INestApplication } from '@nestjs/common';
import { ValidateStockUseCase } from '@application/inventory/use-cases/validate-stock.use-case';
import { StockInsufficientException } from '@domain/inventory/exceptions/stock-insufficient.exception';
import { createTestingApp } from '../helpers/app.factory';
import {
  resetDatabase,
  getOutboxEvents,
  countOutboxEvents,
  getStockByProductId,
} from '../helpers/database.helper';
import { SEED } from '../helpers/product.factory';

describe('ValidateStockUseCase (integration)', () => {
  let app:           INestApplication;
  let validateStock: ValidateStockUseCase;

  beforeAll(async () => {
    app           = await createTestingApp();
    validateStock = app.get(ValidateStockUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  // ─── Reserva exitosa ─────────────────────────────────────────────────────────

  describe('cuando hay stock disponible', () => {
    it('completa sin lanzar excepción', async () => {
      await validateStock.execute({
        orderId:   1001,
        productId: SEED.PRODUCT_COCA_250,
        quantity:  10,
      });
    });

    it('incrementa reserved_qty en la cantidad reservada', async () => {
      const before = await getStockByProductId(app, SEED.PRODUCT_COCA_250);

      await validateStock.execute({
        orderId:   1002,
        productId: SEED.PRODUCT_COCA_250,
        quantity:  5,
      });

      const after = await getStockByProductId(app, SEED.PRODUCT_COCA_250);
      expect(Number(after!.reserved_qty)).toBe(Number(before!.reserved_qty) + 5);
    });

    it('escribe exactamente un evento inventory.validated en el outbox', async () => {
      await validateStock.execute({
        orderId:   1003,
        productId: SEED.PRODUCT_COCA_500,
        quantity:  3,
      });

      const events = await getOutboxEvents(app, 'inventory.validated');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        aggregate_type: 'inventory',
        aggregate_id:   SEED.PRODUCT_COCA_500,
        event_type:     'inventory.validated',
        status:         'pending',
        retries:        0,
      });
    });

    it('el payload del evento contiene orderId, productId y quantity', async () => {
      const command = { orderId: 1004, productId: SEED.PRODUCT_COCA_250, quantity: 2 };

      await validateStock.execute(command);

      const [event] = await getOutboxEvents(app, 'inventory.validated');
      expect(event.payload).toMatchObject({
        orderId:   command.orderId,
        productId: command.productId,
        quantity:  command.quantity,
      });
    });

    it('acumula un evento por cada reserva independiente', async () => {
      await validateStock.execute({ orderId: 2001, productId: SEED.PRODUCT_COCA_250, quantity: 1 });
      await validateStock.execute({ orderId: 2002, productId: SEED.PRODUCT_COCA_500,  quantity: 1 });
      await validateStock.execute({ orderId: 2003, productId: SEED.PRODUCT_ARROZ,     quantity: 1 });

      const total = await countOutboxEvents(app, 'inventory.validated');
      expect(total).toBe(3);
    });
  });

  // ─── Stock insuficiente ──────────────────────────────────────────────────────

  describe('cuando el stock es insuficiente', () => {
    it('lanza StockInsufficientException', async () => {
      await expect(
        validateStock.execute({
          orderId:   3001,
          productId: SEED.PRODUCT_COCA_250,
          quantity:  9999,
        }),
      ).rejects.toThrow(StockInsufficientException);
    });

    it('no modifica reserved_qty cuando falla', async () => {
      const before = await getStockByProductId(app, SEED.PRODUCT_COCA_250);

      await validateStock.execute({
        orderId: 3002, productId: SEED.PRODUCT_COCA_250, quantity: 9999,
      }).catch(() => undefined);

      const after = await getStockByProductId(app, SEED.PRODUCT_COCA_250);
      expect(after!.reserved_qty).toBe(before!.reserved_qty);
    });

    it('escribe un evento inventory.insufficient en el outbox', async () => {
      await validateStock.execute({
        orderId: 3003, productId: SEED.PRODUCT_COCA_250, quantity: 9999,
      }).catch(() => undefined);

      const events = await getOutboxEvents(app, 'inventory.insufficient');
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({
        orderId:   3003,
        productId: SEED.PRODUCT_COCA_250,
      });
    });

    it('no escribe inventory.validated cuando falla', async () => {
      await validateStock.execute({
        orderId: 3004, productId: SEED.PRODUCT_COCA_250, quantity: 9999,
      }).catch(() => undefined);

      const count = await countOutboxEvents(app, 'inventory.validated');
      expect(count).toBe(0);
    });
  });
});
