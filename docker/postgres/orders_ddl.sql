-- ============================================================
-- orders_db — DDL
-- ============================================================

\c orders_db;

-- ── Tipos enumerados ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',    -- Creada, esperando validación de inventario
    'confirmed',  -- Inventario validado, esperando pago
    'paid',       -- Pago confirmado por payments-ms
    'cancelled'   -- Cancelada por stock insuficiente u otro motivo
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── orders ────────────────────────────────────────────────────────────────
-- Registro de órdenes de compra. El ciclo de vida del estado evoluciona
-- según los eventos Kafka que llegan de inventory-ms y payments-ms.

CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL          PRIMARY KEY,
  product_id   INTEGER         NOT NULL,
  quantity     NUMERIC(10,3)   NOT NULL,
  customer_id  INTEGER         NOT NULL,
  total_amount NUMERIC(10,2)   NOT NULL,
  status       order_status    NOT NULL DEFAULT 'pending',
  notes        TEXT            NULL     DEFAULT NULL,
  -- auditoría
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  orders              IS 'Órdenes de compra; estado gestionado mediante saga Kafka entre inventory-ms y payments-ms';
COMMENT ON COLUMN orders.id           IS 'Identificador único autoincremental';
COMMENT ON COLUMN orders.product_id   IS 'ID del producto en inventory_db (sin FK física — bases de datos distintas)';
COMMENT ON COLUMN orders.quantity     IS 'Cantidad solicitada del producto (3 decimales para fracciones de kg/L)';
COMMENT ON COLUMN orders.customer_id  IS 'ID del cliente (futuro microservicio de clientes; sin FK física)';
COMMENT ON COLUMN orders.total_amount IS 'Monto total de la orden en moneda local (2 decimales)';
COMMENT ON COLUMN orders.status       IS 'Estado actual: pending | confirmed | paid | cancelled';
COMMENT ON COLUMN orders.notes        IS 'Razón de cancelación (OrderCancellationReason) cuando status = cancelled; NULL en cualquier otro estado';
COMMENT ON COLUMN orders.created_at   IS 'Fecha y hora de creación de la orden (UTC)';
COMMENT ON COLUMN orders.updated_at   IS 'Fecha y hora del último cambio de estado (UTC)';

CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer        ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product         ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created         ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created  ON orders(status, created_at ASC) WHERE status = 'pending';


-- ── outbox_events ──────────────────────────────────────────────────────────
-- Tabla de outbox transaccional. Cada evento Kafka se escribe aquí en la
-- misma transacción que la mutación de dominio. El relay (OutboxRelayService)
-- los lee y los publica a Kafka, evitando el dual-write problem.

DO $$ BEGIN
  CREATE TYPE outbox_event_status AS ENUM (
    'pending',    -- Esperando ser publicado
    'published',  -- Publicado exitosamente en Kafka
    'failed'      -- Error al publicar; ver error_message
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS outbox_events (
  id             SERIAL               PRIMARY KEY,
  aggregate_type VARCHAR(100)         NOT NULL,
  aggregate_id   INTEGER              NOT NULL,
  event_type     VARCHAR(200)         NOT NULL,
  payload        JSONB                NOT NULL,
  status         outbox_event_status  NOT NULL DEFAULT 'pending',
  retries        SMALLINT             NOT NULL DEFAULT 0,
  error_message  TEXT,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ
);

COMMENT ON TABLE  outbox_events              IS 'Outbox transaccional: eventos pendientes de publicar en Kafka';
COMMENT ON COLUMN outbox_events.aggregate_type IS 'Tipo del agregado que generó el evento (ej: order)';
COMMENT ON COLUMN outbox_events.aggregate_id   IS 'ID del agregado';
COMMENT ON COLUMN outbox_events.event_type     IS 'Nombre del topic Kafka destino';
COMMENT ON COLUMN outbox_events.payload        IS 'Cuerpo del mensaje en formato JSON';
COMMENT ON COLUMN outbox_events.status         IS 'Estado de publicación: pending | published | failed';
COMMENT ON COLUMN outbox_events.retries        IS 'Número de intentos fallidos';

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at ASC)
  WHERE status = 'pending';
