# Diagrama Entidad-Relación — technical-interview-kibernum

---

## Vista de plataforma — 3 bases de datos

> Líneas **sólidas** = FK física (misma base de datos).  
> Líneas **punteadas** = referencia lógica cross-DB (sin FK, garantizada por saga Kafka).

---

## inventory\_db — Detalle completo

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
        int     id                     PK
        varchar sku                    UK
        varchar barcode                UK
        varchar name
        text    description
        int     category_id            FK
        int     brand_id               FK
        int     uom_id                 FK
        numeric purchase_price
        numeric min_stock
        numeric max_stock
        numeric reorder_point
        numeric reorder_quantity
        boolean is_perishable
        int     shelf_life_days
        boolean requires_refrigeration
        boolean is_active
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    inventory_stock {
        int     id               PK
        int     product_id       FK
        numeric quantity
        numeric reserved_qty
        tstz    last_movement_at
        tstz    last_count_at
        tstz    created_at
        tstz    updated_at
        varchar created_by
        varchar updated_by
    }

    stock_movements {
        int     id             PK
        int     product_id     FK
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

    outbox_events {
        int      id             PK
        varchar  aggregate_type
        int      aggregate_id
        varchar  event_type
        jsonb    payload
        enum     status
        smallint retries
        text     error_message
        tstz     created_at
        tstz     published_at
    }

    categories       ||--o{ categories        : "parent_id (jerarquía)"
    categories       ||--o{ products          : "category_id"
    brands           |o--o{ products          : "brand_id (nullable)"
    units_of_measure ||--o{ products          : "uom_id"
    products         ||--|| inventory_stock   : "product_id (UNIQUE)"
    products         ||--o{ stock_movements   : "product_id"
```

**Enums:**
| Enum | Valores |
|---|---|
| `uom_type` | `MASS` · `VOLUME` · `UNIT` · `PACK` |
| `movement_type` | `RESERVATION` · `RESERVATION_CONFIRMED` · `RESERVATION_RELEASED` |
| `outbox_event_status` | `pending` · `published` · `failed` |

---

## orders\_db — Detalle completo

```mermaid
erDiagram

    orders {
        int     id           PK
        int     product_id   
        numeric quantity
        int     customer_id  
        numeric total_amount
        enum    status
        text    notes
        tstz    created_at
        tstz    updated_at
    }

    outbox_events {
        int      id             PK
        varchar  aggregate_type
        int      aggregate_id
        varchar  event_type
        jsonb    payload
        enum     status
        smallint retries
        text     error_message
        tstz     created_at
        tstz     published_at
    }
```

**Enums:**
| Enum | Valores |
|---|---|
| `order_status` | `pending` · `confirmed` · `paid` · `cancelled` |
| `outbox_event_status` | `pending` · `published` · `failed` |

---

## payments\_db — Detalle completo

```mermaid
erDiagram

    payments {
        int     id             PK
        int     order_id       UK
        numeric amount
        varchar currency
        enum    status
        varchar transaction_id
        text    failure_reason
        tstz    created_at
        tstz    updated_at
    }

    outbox_events {
        int      id             PK
        varchar  aggregate_type
        int      aggregate_id
        varchar  event_type
        jsonb    payload
        enum     status
        smallint retries
        text     error_message
        tstz     created_at
        tstz     published_at
    }
```

**Enums:**
| Enum | Valores |
|---|---|
| `payment_status` | `pending` · `approved` · `rejected` |
| `outbox_event_status` | `pending` · `published` · `failed` |

---
