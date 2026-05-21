import { INestApplication } from '@nestjs/common';
import { getDataSourceToken }  from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ─── DataSource ──────────────────────────────────────────────────────────────

export function getDataSource(app: INestApplication): DataSource {
  return app.get<DataSource>(getDataSourceToken());
}

// ─── Limpieza ─────────────────────────────────────────────────────────────────

/**
 * Elimina todas las filas de `orders` y `outbox_events` y reinicia las
 * secuencias de los IDs.  Debe llamarse en `beforeEach` para garantizar
 * aislamiento entre tests.
 */
export async function truncateDatabase(app: INestApplication): Promise<void> {
  const ds = getDataSource(app);
  await ds.query(
    'TRUNCATE TABLE outbox_events, orders RESTART IDENTITY CASCADE',
  );
}

// ─── Consultas de apoyo ───────────────────────────────────────────────────────

/** Retorna todos los registros del outbox, opcionalmente filtrados por tipo de evento. */
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

  return ds.query<OutboxEventRow[]>(
    'SELECT * FROM outbox_events ORDER BY id ASC',
  );
}

/** Cuenta cuántos registros del outbox existen para un tipo de evento. */
export async function countOutboxEvents(
  app: INestApplication,
  eventType: string,
): Promise<number> {
  const rows = await getOutboxEvents(app, eventType);
  return rows.length;
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
