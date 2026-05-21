import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/app.factory';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('retorna 200 con el estado del servicio', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      service: 'orders-ms',
      status:  'ok',
    });
    expect(response.body.timestamp).toBeDefined();
  });
});
