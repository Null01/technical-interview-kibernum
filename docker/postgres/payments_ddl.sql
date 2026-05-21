-- ============================================================
-- payments_db — DDL
-- Proyecto : technical-interview-kibernum / payments-ms
-- Tablas   : payments, outbox_events
--
-- Diseño de idempotencia:
--   · payments.order_id tiene restricción UNIQUE. Solo puede existir
--     un pago por orden, garantizando que re-entregas del evento
--     `order.confirmed` no generen cobros duplicados.
--
-- Flujo saga Kafka:
--   order.confirmed (orders-ms) → payments-ms
--     └─ APPROVED → payment.processed → orders-ms (→ order.paid)
--     └─ REJECTED → payment.failed    → orders-ms (→ order.cancelled)
-- ============================================================

\c payments_db;

-- ── Enumerado de estado de pago ────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',   -- Creado, aún no procesado por la pasarela
    'approved',  -- Pago aprobado exitosamente
    'rejected'   -- Pago rechazado por la pasarela
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── payments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL          PRIMARY KEY,
  order_id        INTEGER         NOT NULL,
  amount          NUMERIC(10,2)   NOT NULL,
  currency        VARCHAR(3)      NOT NULL DEFAULT 'COP',
  status          payment_status  NOT NULL DEFAULT 'pending',
  transaction_id  VARCHAR(100),
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Clave de idempotencia: un único pago por orden
  CONSTRAINT uq_payments_order_id UNIQUE (order_id)
);

COMMENT ON TABLE  payments               IS 'Registro de pagos; un único pago por orden (restricción UNIQUE en order_id)';
COMMENT ON COLUMN payments.order_id      IS 'ID de la orden en orders_db — clave de idempotencia (UNIQUE)';
COMMENT ON COLUMN payments.amount        IS 'Monto cobrado en moneda local (2 decimales)';
COMMENT ON COLUMN payments.currency      IS 'Código ISO 4217 de la moneda (COP por defecto)';
COMMENT ON COLUMN payments.status        IS 'Estado del pago: pending | approved | rejected';
COMMENT ON COLUMN payments.transaction_id IS 'ID de transacción retornado por la pasarela (nulo si rechazado)';
COMMENT ON COLUMN payments.failure_reason IS 'Motivo del rechazo (nulo si aprobado)';

CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);


-- ── outbox_events ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE outbox_event_status AS ENUM (
    'pending',
    'published',
    'failed'
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

COMMENT ON TABLE outbox_events IS 'Outbox transaccional: eventos pendientes de publicar en Kafka';

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at ASC)
  WHERE status = 'pending';
