import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ─── DataSource ───────────────────────────────────────────────────────────────

export function getDataSource(app: INestApplication): DataSource {
  return app.get<DataSource>(getDataSourceToken());
}

// ─── Limpieza ─────────────────────────────────────────────────────────────────

/**
 * Limpia el estado mutable entre tests:
 *  - Elimina todos los movimientos de stock y eventos de outbox.
 *  - Resetea reserved_qty a 0 en inventory_stock para que cada test
 *    parta del stock físico original de la semilla.
 *
 * NO trunca products ni inventory_stock — los datos de catálogo y cantidades
 * físicas vienen del seed y son compartidos por todos los tests de lectura.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const ds = getDataSource(app);
  await ds.query('TRUNCATE TABLE stock_movements, outbox_events RESTART IDENTITY CASCADE');
  await ds.query('UPDATE inventory_stock SET reserved_qty = 0');
}

/**
 * Trunca también las tablas de catálogo.
 * Usar solo en suites de POST /products donde es necesario aislar IDs.
 */
export async function truncateAll(app: INestApplication): Promise<void> {
  const ds = getDataSource(app);
  await ds.query(
    'TRUNCATE TABLE stock_movements, outbox_events, inventory_stock, products RESTART IDENTITY CASCADE',
  );
}

// ─── Consultas de apoyo ───────────────────────────────────────────────────────

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

export async function getStockByProductId(
  app: INestApplication,
  productId: number,
): Promise<StockRow | null> {
  const ds  = getDataSource(app);
  const rows = await ds.query<StockRow[]>(
    'SELECT * FROM inventory_stock WHERE product_id = $1',
    [productId],
  );
  return rows[0] ?? null;
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

export interface StockRow {
  id:              number;
  product_id:      number;
  quantity:        string;
  reserved_qty:    string;
  last_movement_at: Date;
}
