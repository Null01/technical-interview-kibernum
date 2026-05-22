-- ============================================================
-- inventory_db — DDL
-- ============================================================

\c inventory_db;

-- ── Tipos enumerados ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE uom_type AS ENUM (
    'MASS',
    'VOLUME',
    'UNIT',
    'PACK'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'RESERVATION',
    'RESERVATION_CONFIRMED',
    'RESERVATION_RELEASED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'RESERVATION';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'RESERVATION_CONFIRMED';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'RESERVATION_RELEASED';


-- ══════════════════════════════════════════════════════════════════════════
--  CATÁLOGO
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  slug        VARCHAR(100)  NOT NULL UNIQUE,
  description TEXT,
  parent_id   INTEGER       REFERENCES categories(id) ON DELETE RESTRICT,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  updated_by  VARCHAR(100)  NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);


CREATE TABLE IF NOT EXISTS brands (
  id                SERIAL        PRIMARY KEY,
  name              VARCHAR(100)  NOT NULL UNIQUE,
  country_of_origin VARCHAR(100),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  updated_by  VARCHAR(100)  NOT NULL DEFAULT 'system'
);


CREATE TABLE IF NOT EXISTS units_of_measure (
  id           SERIAL        PRIMARY KEY,
  name         VARCHAR(50)   NOT NULL,
  abbreviation VARCHAR(20)   NOT NULL UNIQUE,
  type         uom_type      NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  updated_by  VARCHAR(100)  NOT NULL DEFAULT 'system'
);


CREATE TABLE IF NOT EXISTS products (
  id                     SERIAL         PRIMARY KEY,
  sku                    VARCHAR(50)    NOT NULL UNIQUE,
  barcode                VARCHAR(50)    UNIQUE,
  name                   VARCHAR(200)   NOT NULL,
  description            TEXT,
  category_id            INTEGER        NOT NULL REFERENCES categories(id)       ON DELETE RESTRICT,
  brand_id               INTEGER                 REFERENCES brands(id)           ON DELETE SET NULL,
  uom_id                 INTEGER        NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  purchase_price         NUMERIC(10,2)  NOT NULL DEFAULT 0,
  min_stock              NUMERIC(10,3)  NOT NULL DEFAULT 0,
  max_stock              NUMERIC(10,3),
  reorder_point          NUMERIC(10,3)  NOT NULL DEFAULT 0,
  reorder_quantity       NUMERIC(10,3)  NOT NULL DEFAULT 0,
  is_perishable          BOOLEAN        NOT NULL DEFAULT FALSE,
  shelf_life_days        INTEGER,
  requires_refrigeration BOOLEAN        NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  updated_by  VARCHAR(100)  NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_perishable ON products(is_perishable) WHERE is_perishable = TRUE;


-- ══════════════════════════════════════════════════════════════════════════
--  STOCK
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_stock (
  id               SERIAL         PRIMARY KEY,
  product_id       INTEGER        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity         NUMERIC(10,3)  NOT NULL DEFAULT 0,
  reserved_qty     NUMERIC(10,3)  NOT NULL DEFAULT 0,
  last_movement_at TIMESTAMPTZ,
  last_count_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  updated_by  VARCHAR(100)  NOT NULL DEFAULT 'system',
  CONSTRAINT uq_stock_product UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON inventory_stock(product_id);


CREATE TABLE IF NOT EXISTS stock_movements (
  id             SERIAL        PRIMARY KEY,
  product_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type           movement_type NOT NULL,
  qty_change     NUMERIC(10,3) NOT NULL,
  qty_before     NUMERIC(10,3) NOT NULL,
  qty_after      NUMERIC(10,3) NOT NULL,
  reference_type VARCHAR(50),
  reference_id   INTEGER,
  notes          TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  VARCHAR(100)  NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type    ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_ref     ON stock_movements(reference_type, reference_id, type) WHERE reference_type IS NOT NULL;


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

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at ASC)
  WHERE status = 'pending';
