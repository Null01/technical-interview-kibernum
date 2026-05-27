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
 *  - Restaura quantity a los valores originales de la semilla y resetea
 *    reserved_qty a 0, de modo que cada test parta del inventario inicial
 *    aunque confirmReservation haya decrementado quantity en tests previos.
 *
 * NO trunca products ni inventory_stock — los datos de catálogo se conservan
 * y las cantidades físicas se restauran explícitamente desde la semilla.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const ds = getDataSource(app);
  await ds.query('TRUNCATE TABLE stock_movements, outbox_events RESTART IDENTITY CASCADE');
  // Restore original seed quantities so confirm-reservation tests don't
  // permanently deplete stock visible to later tests and reruns.
  await ds.query(`
    UPDATE inventory_stock
    SET quantity = sub.qty, reserved_qty = 0
    FROM (
      SELECT p.id AS product_id, d.qty
      FROM (VALUES
        ('BEB-COK-250',   96),
        ('BEB-COK-500',   60),
        ('BEB-POST-MAN',  72),
        ('BEB-AGU-600',  144),
        ('ALI-ARR-1KG',   60),
        ('ALI-FRI-500G',  40),
        ('ALI-AZU-1KG',   50),
        ('ALI-SAL-500G',  45),
        ('ALI-SAL-FRU',   30),
        ('ALI-ATU-150G',  36),
        ('SNK-PAP-45G',   72),
        ('PAN-TAJ-500G',  12),
        ('ASP-COL-75ML',  18),
        ('LIM-DET-500G',  20),
        ('LIM-PAP-HOG',   30),
        ('LAC-LEC-1L',    30),
        ('LAC-YOG-200G',  24),
        ('LAC-QUE-250G',  15)
      ) AS d(sku, qty)
      JOIN products p ON p.sku = d.sku
    ) AS sub
    WHERE inventory_stock.product_id = sub.product_id
  `);
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
