# Diagrama Entidad-Relación — technical-interview-kibernum

Dos bases de datos independientes. Las relaciones entre `orders_db` e `inventory_db` son **lógicas** (sin FK física): la consistencia se garantiza mediante la saga Kafka `order.created → inventory.validated → order.confirmed`.

---

## inventory_db

```mermaid
erDiagram
    categories {
        int     id           PK
        varchar name
        varchar slug         UK
        text    description
        int     parent_id    FK
        int     sort_order
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    brands {
        int     id                PK
        varchar name              UK
        varchar country_of_origin
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    units_of_measure {
        int     id           PK
        varchar name
        varchar abbreviation UK
        enum    type
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    products {
        int      id                     PK
        varchar  sku                    UK
        varchar  barcode                UK
        varchar  name
        text     description
        int      category_id            FK
        int      brand_id               FK
        int      uom_id                 FK
        numeric  purchase_price
        numeric  min_stock
        numeric  max_stock
        numeric  reorder_point
        numeric  reorder_quantity
        boolean  is_perishable
        int      shelf_life_days
        boolean  requires_refrigeration
        boolean  is_active
        tstz     created_at
        tstz     updated_at
        varchar  created_by
        varchar  updated_by
    }

    storage_locations {
        int     id        PK
        varchar code      UK
        varchar name
        varchar aisle
        varchar shelf
        boolean is_active
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    inventory_stock {
        int     id               PK
        int     product_id       FK
        int     location_id      FK
        numeric quantity
        numeric reserved_qty
        tstz    last_movement_at
        tstz    last_count_at
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    batches {
        int     id                 PK
        int     product_id         FK
        int     location_id        FK
        varchar batch_number
        date    manufacturing_date
        date    expiry_date
        numeric initial_quantity
        numeric current_quantity
        boolean is_active
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    stock_movements {
        int     id             PK
        int     product_id     FK
        int     location_id    FK
        int     batch_id       FK
        enum    type
        numeric qty_change
        numeric qty_before
        numeric qty_after
        varchar reference_type
        int     reference_id
        text    notes
        tstz    created_at
        varchar created_by
    }

    categories        ||--o{ categories        : "parent_id (auto-ref)"
    categories        ||--o{ products          : "category_id"
    brands            |o--o{ products          : "brand_id (nullable)"
    units_of_measure  ||--o{ products          : "uom_id"
    products          ||--o{ inventory_stock   : "product_id"
    storage_locations ||--o{ inventory_stock   : "location_id"
    products          ||--o{ batches           : "product_id"
    storage_locations ||--o{ batches           : "location_id"
    products          ||--o{ stock_movements   : "product_id"
    storage_locations ||--o{ stock_movements   : "location_id"
    batches           |o--o{ stock_movements   : "batch_id (nullable)"
```

---

## orders_db

```mermaid
erDiagram
    orders {
        int     id           PK
        int     product_id
        numeric quantity
        int     customer_id
        numeric total_amount
        enum    status
        tstz    created_at
        tstz    updated_at
    }
```

> **`orders.product_id`** referencia lógica a `inventory_db.products.id` — sin FK física por tratarse de bases de datos independientes.

---

## Flujo saga (cross-DB)

```
orders-ms          inventory-ms          payments-ms
────────────────────────────────────────────────────
POST /orders
  → INSERT orders (pending)
  → KAFKA: order.created
                           ← KAFKA: order.created
                           validate stock
                           UPDATE inventory_stock
                           INSERT stock_movements
                           → KAFKA: inventory.validated
                                        ó
                           → KAFKA: inventory.insufficient
← KAFKA: inventory.validated
  UPDATE orders (confirmed)
  → KAFKA: order.confirmed
                                        ← KAFKA: order.confirmed
                                        process payment
                                        → KAFKA: payment.processed
← KAFKA: payment.processed
  UPDATE orders (paid)
```

---

## Validación de entidades TypeORM vs DDL

### inventory_db

| Tabla DDL          | Entidad TypeORM               | Estado  |
|--------------------|-------------------------------|---------|
| `categories`       | `CategoryOrmEntity`           | ✅ OK   |
| `brands`           | `BrandOrmEntity`              | ✅ OK   |
| `units_of_measure` | `UnitOfMeasureOrmEntity`      | ✅ OK   |
| `products`         | `ProductOrmEntity`            | ✅ OK   |
| `storage_locations`| `StorageLocationOrmEntity`    | ✅ OK   |
| `inventory_stock`  | `InventoryStockOrmEntity`     | ✅ OK   |
| `batches`          | `BatchOrmEntity`              | ✅ OK   |
| `stock_movements`  | `StockMovementOrmEntity`      | ✅ OK   |

**Notas inventory-ms:**
- Columnas `| null` en TypeScript usan `type:` explícito en `@Column` para evitar `DataTypeNotSupportedError` con `emitDecoratorMetadata`.
- `stock_movements` extiende `ImmutableAuditEntity` (solo `created_at` / `created_by`), coherente con la tabla append-only del DDL.
- El enum `movement_type` del DDL coincide con `MovementType` TypeScript (mismo conjunto de valores).

### orders_db

| Tabla DDL | Entidad TypeORM    | Estado  |
|-----------|--------------------|---------|
| `orders`  | `OrderOrmEntity`   | ✅ OK   |

**Detalle columna a columna — `orders`:**

| Columna DDL   | TypeORM `@Column`                                         | Match |
|---------------|-----------------------------------------------------------|-------|
| `id`          | `@PrimaryGeneratedColumn()`                               | ✅    |
| `product_id`  | `@Column({ name: 'product_id' })`                        | ✅    |
| `quantity`    | `@Column({ type: 'numeric', precision: 10, scale: 3 })`  | ✅    |
| `customer_id` | `@Column({ name: 'customer_id' })`                       | ✅    |
| `total_amount`| `@Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })` | ✅ |
| `status`      | `@Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.PENDING })` | ✅ |
| `created_at`  | `@CreateDateColumn({ name: 'created_at' })` (AuditableEntity) | ✅ |
| `updated_at`  | `@UpdateDateColumn({ name: 'updated_at' })` (AuditableEntity) | ✅ |

**Valores del enum `order_status`:**

| DDL value    | TypeScript `OrderStatus` | Match |
|--------------|--------------------------|-------|
| `'pending'`  | `PENDING = 'pending'`    | ✅    |
| `'confirmed'`| `CONFIRMED = 'confirmed'`| ✅    |
| `'paid'`     | `PAID = 'paid'`          | ✅    |
| `'cancelled'`| `CANCELLED = 'cancelled'`| ✅    |
