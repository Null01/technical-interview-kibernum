import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/app.factory';

describe('GET /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await createTestingApp(); });
  afterAll(async ()  => { await app.close(); });

  it('retorna 200 con service y status ok', async () => {
    const { body } = await request(app.getHttpServer()).get('/health').expect(200);

    expect(body).toMatchObject({ service: 'orders-ms', status: 'ok' });
    expect(body.timestamp).toBeDefined();
  });
});
