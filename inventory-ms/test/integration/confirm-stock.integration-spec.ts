import { INestApplication } from '@nestjs/common';
import { ValidateStockUseCase } from '@application/inventory/use-cases/validate-stock.use-case';
import { ConfirmStockReservationUseCase } from '@application/inventory/use-cases/confirm-stock-reservation.use-case';
import { createTestingApp } from '../helpers/app.factory';
import {
  resetDatabase,
  getStockByProductId,
} from '../helpers/database.helper';
import { SEED } from '../helpers/product.factory';

describe('ConfirmStockReservationUseCase (integration)', () => {
  let app:               INestApplication;
  let validateStock:     ValidateStockUseCase;
  let confirmReservation: ConfirmStockReservationUseCase;

  beforeAll(async () => {
    app               = await createTestingApp();
    validateStock     = app.get(ValidateStockUseCase);
    confirmReservation = app.get(ConfirmStockReservationUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  // ─── Confirmación exitosa ────────────────────────────────────────────────────

  describe('cuando existe una reserva previa', () => {
    it('completa sin lanzar excepción', async () => {
      await validateStock.execute({ orderId: 4001, productId: SEED.PRODUCT_COCA_250, quantity: 5 });
      await confirmReservation.execute({ orderId: 4001, productId: SEED.PRODUCT_COCA_250, quantity: 5 });
    });

    it('decrementa quantity en la cantidad confirmada', async () => {
      const before = await getStockByProductId(app, SEED.PRODUCT_COCA_500);

      await validateStock.execute({ orderId: 4002, productId: SEED.PRODUCT_COCA_500, quantity: 4 });
      await confirmReservation.execute({ orderId: 4002, productId: SEED.PRODUCT_COCA_500, quantity: 4 });

      const after = await getStockByProductId(app, SEED.PRODUCT_COCA_500);
      expect(Number(after!.quantity)).toBe(Number(before!.quantity) - 4);
    });

    it('decrementa reserved_qty en la cantidad confirmada', async () => {
      await validateStock.execute({ orderId: 4003, productId: SEED.PRODUCT_COCA_250, quantity: 6 });
      const afterReserve = await getStockByProductId(app, SEED.PRODUCT_COCA_250);

      await confirmReservation.execute({ orderId: 4003, productId: SEED.PRODUCT_COCA_250, quantity: 6 });

      const afterConfirm = await getStockByProductId(app, SEED.PRODUCT_COCA_250);
      expect(Number(afterConfirm!.reserved_qty)).toBe(Number(afterReserve!.reserved_qty) - 6);
    });
  });

  // ─── No-op cuando no existe el producto ─────────────────────────────────────

  describe('cuando no existe registro de stock', () => {
    it('no lanza excepción — operación idempotente', async () => {
      await confirmReservation.execute({ orderId: 5001, productId: 999999, quantity: 1 });
    });
  });
});
