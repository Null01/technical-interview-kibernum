import { INestApplication } from '@nestjs/common';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { OrderNotFoundException } from '@domain/order/exceptions/order-not-found.exception';
import { createTestingApp } from '../helpers/app.factory';
import { truncateDatabase } from '../helpers/database.helper';
import { buildCreateOrderPayload, CUSTOMER, PAGEABLE_COUNT } from '../helpers/order.factory';

describe('FindOrderUseCase (integration)', () => {
  let app:         INestApplication;
  let findOrder:   FindOrderUseCase;
  let createOrder: CreateOrderUseCase;

  beforeAll(async () => {
    app         = await createTestingApp();
    findOrder   = app.get(FindOrderUseCase);
    createOrder = app.get(CreateOrderUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(app);
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna la orden cuando existe', async () => {
      const created = await createOrder.execute(
        buildCreateOrderPayload({ productId: 4, quantity: 6 }),
      );

      const found = await findOrder.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.productId).toBe(4);
      expect(found.quantity).toBe(6);
      expect(found.status).toBe(OrderStatus.PENDING);
    });

    it('lanza OrderNotFoundException cuando el id no existe', async () => {
      await expect(findOrder.findById(999999)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  // ─── findMany — sin filtros ─────────────────────────────────────────────────

  describe('findMany — sin filtros', () => {
    it('retorna todos los registros con paginación por defecto', async () => {
      await createOrder.execute(buildCreateOrderPayload());
      await createOrder.execute(buildCreateOrderPayload());

      const result = await findOrder.findMany({});

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('retorna resultado vacío cuando no hay órdenes', async () => {
      const result = await findOrder.findMany({});

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  // ─── findMany — filtros ─────────────────────────────────────────────────────

  describe('findMany — filtros', () => {
    it('filtra por customerId y devuelve solo sus órdenes', async () => {
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.ALICE }));
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.BOB }));
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.ALICE }));

      const result = await findOrder.findMany({ customerId: CUSTOMER.ALICE });

      expect(result.total).toBe(2);
      expect(result.data.every(o => o.customerId === CUSTOMER.ALICE)).toBe(true);
    });

    it('filtra por status=pending', async () => {
      await createOrder.execute(buildCreateOrderPayload());

      const result = await findOrder.findMany({ status: OrderStatus.PENDING });

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.data.every(o => o.status === OrderStatus.PENDING)).toBe(true);
    });

    it('filtra por productId', async () => {
      await createOrder.execute(buildCreateOrderPayload({ productId: 11 }));
      await createOrder.execute(buildCreateOrderPayload({ productId: 22 }));

      const result = await findOrder.findMany({ productId: 11 });

      expect(result.total).toBe(1);
      expect(result.data[0].productId).toBe(11);
    });

    it('retorna vacío cuando el filtro no coincide con ninguna orden', async () => {
      await createOrder.execute(buildCreateOrderPayload({ customerId: CUSTOMER.ALICE }));

      const result = await findOrder.findMany({ customerId: CUSTOMER.BOB });

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  // ─── findMany — paginación ──────────────────────────────────────────────────

  describe('findMany — paginación', () => {
    beforeEach(async () => {
      for (let i = 0; i < PAGEABLE_COUNT; i++) {
        await createOrder.execute(buildCreateOrderPayload());
      }
    });

    it('respeta el limit y devuelve el total real', async () => {
      const result = await findOrder.findMany({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(PAGEABLE_COUNT);
      expect(result.limit).toBe(2);
    });

    it('page 2 devuelve el siguiente bloque sin solapamiento', async () => {
      const page1 = await findOrder.findMany({ page: 1, limit: 2 });
      const page2 = await findOrder.findMany({ page: 2, limit: 2 });

      const ids1 = page1.data.map(o => o.id);
      const ids2 = page2.data.map(o => o.id);
      expect(ids1.some(id => ids2.includes(id))).toBe(false);
    });

    it('la última página puede devolver menos registros que el limit', async () => {
      // 5 órdenes, limit 2 → página 3 tiene 1 orden
      const page3 = await findOrder.findMany({ page: 3, limit: 2 });
      expect(page3.data).toHaveLength(1);
    });
  });

  // ─── findMany — ordenamiento ────────────────────────────────────────────────

  describe('findMany — ordenamiento', () => {
    it('ordena por totalAmount ASC', async () => {
      await createOrder.execute(buildCreateOrderPayload({ totalAmount: 9000 }));
      await createOrder.execute(buildCreateOrderPayload({ totalAmount: 1000 }));
      await createOrder.execute(buildCreateOrderPayload({ totalAmount: 5000 }));

      const result = await findOrder.findMany({
        sortBy:  'totalAmount',
        sortDir: 'ASC',
      });

      const amounts = result.data.map(o => Number(o.totalAmount));
      const sorted  = [...amounts].sort((a, b) => a - b);
      expect(amounts).toEqual(sorted);
    });

    it('ordena por totalAmount DESC', async () => {
      await createOrder.execute(buildCreateOrderPayload({ totalAmount: 2000 }));
      await createOrder.execute(buildCreateOrderPayload({ totalAmount: 8000 }));

      const result = await findOrder.findMany({
        sortBy:  'totalAmount',
        sortDir: 'DESC',
      });

      const amounts = result.data.map(o => Number(o.totalAmount));
      const sorted  = [...amounts].sort((a, b) => b - a);
      expect(amounts).toEqual(sorted);
    });
  });
});
