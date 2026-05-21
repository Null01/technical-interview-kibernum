import { INestApplication } from '@nestjs/common';
import { ValidateStockUseCase } from '@application/inventory/use-cases/validate-stock.use-case';
import { ReleaseStockReservationUseCase } from '@application/inventory/use-cases/release-stock-reservation.use-case';
import { createTestingApp } from '../helpers/app.factory';
import {
  resetDatabase,
  getStockByProductId,
} from '../helpers/database.helper';
import { SEED } from '../helpers/product.factory';

describe('ReleaseStockReservationUseCase (integration)', () => {
  let app:              INestApplication;
  let validateStock:    ValidateStockUseCase;
  let releaseReservation: ReleaseStockReservationUseCase;

  beforeAll(async () => {
    app               = await createTestingApp();
    validateStock     = app.get(ValidateStockUseCase);
    releaseReservation = app.get(ReleaseStockReservationUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  // ─── Liberación exitosa ──────────────────────────────────────────────────────

  describe('cuando existe una reserva previa', () => {
    it('completa sin lanzar excepción', async () => {
      await validateStock.execute({ orderId: 6001, productId: SEED.PRODUCT_COCA_250, quantity: 5 });
      await releaseReservation.execute({ orderId: 6001, productId: SEED.PRODUCT_COCA_250, quantity: 5 });
    });

    it('decrementa reserved_qty en la cantidad liberada', async () => {
      await validateStock.execute({ orderId: 6002, productId: SEED.PRODUCT_COCA_500, quantity: 8 });
      const afterReserve = await getStockByProductId(app, SEED.PRODUCT_COCA_500);

      await releaseReservation.execute({ orderId: 6002, productId: SEED.PRODUCT_COCA_500, quantity: 8 });

      const afterRelease = await getStockByProductId(app, SEED.PRODUCT_COCA_500);
      expect(Number(afterRelease!.reserved_qty)).toBe(Number(afterReserve!.reserved_qty) - 8);
    });

    it('NO modifica quantity física al liberar (solo reserved_qty)', async () => {
      const initial = await getStockByProductId(app, SEED.PRODUCT_ARROZ);

      await validateStock.execute({ orderId: 6003, productId: SEED.PRODUCT_ARROZ, quantity: 3 });
      await releaseReservation.execute({ orderId: 6003, productId: SEED.PRODUCT_ARROZ, quantity: 3 });

      const after = await getStockByProductId(app, SEED.PRODUCT_ARROZ);
      expect(Number(after!.quantity)).toBe(Number(initial!.quantity));
    });
  });

  // ─── Idempotencia / no-op ────────────────────────────────────────────────────

  describe('cuando no existe registro de stock', () => {
    it('no lanza excepción cuando el producto no existe', async () => {
      await releaseReservation.execute({ orderId: 7001, productId: 999999, quantity: 1 });
    });
  });

  describe('cuando reserved_qty ya es 0', () => {
    it('no lanza excepción — operación idempotente', async () => {
      await releaseReservation.execute({ orderId: 7002, productId: SEED.PRODUCT_COCA_250, quantity: 5 });
    });
  });
});
