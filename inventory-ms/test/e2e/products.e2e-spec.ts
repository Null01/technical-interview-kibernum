import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/app.factory';
import { buildCreateProductPayload, SEED } from '../helpers/product.factory';

describe('Products API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /products ──────────────────────────────────────────────────────────

  describe('POST /products', () => {
    it('retorna 201 con el producto creado', async () => {
      const payload = buildCreateProductPayload({ brandId: SEED.BRAND_COCA_COLA });

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        sku:           payload.sku,
        name:          payload.name,
        purchasePrice: payload.purchasePrice,
      });
      expect(typeof response.body.id).toBe('number');
    });

    it('retorna 201 con campos opcionales omitidos', async () => {
      const payload = buildCreateProductPayload();

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(201);

      expect(response.body.sku).toBe(payload.sku);
      expect(response.body.id).toBeDefined();
    });

    it('retorna 400 cuando falta sku', async () => {
      const { sku: _sku, ...withoutSku } = buildCreateProductPayload();

      await request(app.getHttpServer())
        .post('/products')
        .send(withoutSku)
        .expect(400);
    });

    it('retorna 400 cuando falta name', async () => {
      const { name: _name, ...withoutName } = buildCreateProductPayload();

      await request(app.getHttpServer())
        .post('/products')
        .send(withoutName)
        .expect(400);
    });

    it('retorna 400 cuando purchasePrice es negativo', async () => {
      const payload = buildCreateProductPayload({ purchasePrice: -100 });

      await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(400);
    });

    it('retorna 400 cuando categoryId no es un entero', async () => {
      const payload = buildCreateProductPayload({ categoryId: 1.5 });

      await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(400);
    });
  });

  // ─── GET /products ───────────────────────────────────────────────────────────

  describe('GET /products', () => {
    it('retorna 200 con al menos los productos de la semilla', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(18);
    });

    it('cada producto incluye id, sku, name y purchasePrice', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      const first = response.body[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('sku');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('purchasePrice');
    });
  });

  // ─── GET /products/:id ───────────────────────────────────────────────────────

  describe('GET /products/:id', () => {
    it('retorna 200 con el producto de la semilla (id=1)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${SEED.PRODUCT_COCA_250}`)
        .expect(200);

      expect(response.body.id).toBe(SEED.PRODUCT_COCA_250);
      expect(response.body.sku).toBeDefined();
    });

    it('retorna 404 cuando el producto no existe', async () => {
      await request(app.getHttpServer())
        .get('/products/999999')
        .expect(404);
    });

    it('retorna 400 cuando el id no es un número', async () => {
      await request(app.getHttpServer())
        .get('/products/abc')
        .expect(400);
    });

    it('retorna el producto recién creado por id', async () => {
      const payload = buildCreateProductPayload();

      const created = await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(201);

      const found = await request(app.getHttpServer())
        .get(`/products/${created.body.id}`)
        .expect(200);

      expect(found.body.sku).toBe(payload.sku);
    });
  });
});
