import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export function getDataSource(app: INestApplication): DataSource {
  return app.get<DataSource>(getDataSourceToken());
}

/** Elimina todos los pagos y eventos de outbox entre tests. */
export async function truncateDatabase(app: INestApplication): Promise<void> {
  const ds = getDataSource(app);
  await ds.query('TRUNCATE TABLE outbox_events, payments RESTART IDENTITY CASCADE');
}

export async function getOutboxEvents(
  app: INestApplication,
  eventType?: string,
): Promise<OutboxEventRow[]> {
  const ds = getDataSource(app);
  if (eventType) {
    return ds.query<OutboxEventRow[]>(
      'SELECT * FROM outbox_events WHERE event_type = $1 ORDER BY id ASC',
      [eventType],
    );
  }
  return ds.query<OutboxEventRow[]>('SELECT * FROM outbox_events ORDER BY id ASC');
}

export async function countOutboxEvents(
  app: INestApplication,
  eventType: string,
): Promise<number> {
  return (await getOutboxEvents(app, eventType)).length;
}

export async function getAllPayments(app: INestApplication): Promise<PaymentRow[]> {
  return getDataSource(app).query<PaymentRow[]>('SELECT * FROM payments ORDER BY id ASC');
}

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

export interface OutboxEventRow {
  id:             number;
  aggregate_type: string;
  aggregate_id:   number;
  event_type:     string;
  payload:        Record<string, unknown>;
  status:         string;
  retries:        number;
  error_message:  string | null;
  created_at:     Date;
  published_at:   Date | null;
}

export interface PaymentRow {
  id:             number;
  order_id:       number;
  amount:         string;
  currency:       string;
  status:         string;
  transaction_id: string | null;
  failure_reason: string | null;
  created_at:     Date;
}
