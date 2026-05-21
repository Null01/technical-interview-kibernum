# Event-Driven Sequence Diagram

Comunicación entre microservicios mediante Apache Kafka.

---

## Flujo completo

```mermaid
sequenceDiagram
    autonumber

    actor Client as 🧑‍💻 Client

    participant OMS  as orders-ms<br/>(3002)
    participant ODB  as orders DB<br/>(outbox_events)
    participant OMR  as OutboxRelay<br/>[orders-ms]

    participant Kafka as 🟡 Apache Kafka

    participant IMR  as OutboxRelay<br/>[inventory-ms]
    participant IDB  as inventory DB<br/>(outbox_events)
    participant IMS  as inventory-ms<br/>(3001)

    participant PMR  as OutboxRelay<br/>[payments-ms]
    participant PDB  as payments DB<br/>(outbox_events)
    participant PMS  as payments-ms<br/>(3003)

    %% ─────────────────────────────────────────────────────────────
    %% 1. CLIENT CREATES ORDER
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 235, 255)
        Note over Client,OMR: 📦 Paso 1 — Creación de orden (HTTP)
        Client ->>+ OMS: POST /orders<br/>{ productId, quantity, customerId, totalAmount }
        Note right of OMS: TraceInterceptor genera<br/>correlationId → ALS
        OMS ->> ODB: BEGIN TX<br/>INSERT order (status=PENDING)<br/>INSERT outbox_events (order.created, correlationId)
        OMS -->>- Client: 201 Created { orderId }

        Note over OMR,ODB: setInterval (~5 s)
        OMR ->> ODB: findPending()
        ODB -->> OMR: [{ eventType: order.created, payload: { correlationId, ... } }]
        Note right of OMR: runWithLogContext(<br/>  buildInitialContext(correlationId)<br/>)
        OMR ->> Kafka: PUBLISH order.created<br/>header: x-correlation-id
        OMR ->> ODB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 2A. HAPPY PATH — STOCK AVAILABLE
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 255, 230)
        Note over Kafka,IMR: ✅ Paso 2A — Stock disponible
        Kafka ->>+ IMS: CONSUME order.created<br/>header: x-correlation-id
        Note right of IMS: KafkaTraceInterceptor<br/>restaura correlationId → ALS
        IMS ->> IDB: BEGIN TX<br/>UPDATE stock (reserved += qty)<br/>INSERT outbox_events (inventory.validated, correlationId)
        IMS -->>- Kafka: ack

        IMR ->> IDB: findPending()
        IDB -->> IMR: [{ eventType: inventory.validated, payload: { correlationId, ... } }]
        IMR ->> Kafka: PUBLISH inventory.validated<br/>header: x-correlation-id
        IMR ->> IDB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 3A. ORDER CONFIRMED (from inventory.validated)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 255, 230)
        Note over Kafka,OMR: ✅ Paso 3A — Orden confirmada
        Kafka ->>+ OMS: CONSUME inventory.validated<br/>header: x-correlation-id
        OMS ->> ODB: BEGIN TX<br/>UPDATE order (status=CONFIRMED)<br/>INSERT outbox_events (order.confirmed, correlationId)
        OMS -->>- Kafka: ack

        OMR ->> ODB: findPending()
        ODB -->> OMR: [{ eventType: order.confirmed, payload: { correlationId, ... } }]
        OMR ->> Kafka: PUBLISH order.confirmed<br/>header: x-correlation-id
        OMR ->> ODB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 4A. PAYMENT PROCESSED (from order.confirmed)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 255, 230)
        Note over Kafka,PMR: ✅ Paso 4A — Pago aprobado (totalAmount ≤ 500 000 COP)
        Kafka ->>+ PMS: CONSUME order.confirmed<br/>header: x-correlation-id
        Note right of PMS: SimulatedPaymentGateway<br/>amount ≤ 500 000 → approved
        PMS ->> PDB: BEGIN TX<br/>INSERT payment (status=APPROVED)<br/>INSERT outbox_events (payment.processed, correlationId)
        PMS -->>- Kafka: ack

        PMR ->> PDB: findPending()
        PDB -->> PMR: [{ eventType: payment.processed, payload: { correlationId, ... } }]
        PMR ->> Kafka: PUBLISH payment.processed<br/>header: x-correlation-id
        PMR ->> PDB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 5A. ORDER COMPLETED (from payment.processed)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 255, 230)
        Note over Kafka,OMS: ✅ Paso 5A — Orden completada
        Kafka ->>+ OMS: CONSUME payment.processed<br/>header: x-correlation-id
        OMS ->> ODB: UPDATE order (status=PAID)
        OMS -->>- Kafka: ack
    end

    %% ─────────────────────────────────────────────────────────────
    %% 4B. INVENTORY ALSO CONFIRMS STOCK (from order.confirmed)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(220, 255, 230)
        Note over Kafka,IMS: ✅ Paso 4B — Stock confirmado definitivamente
        Kafka ->>+ IMS: CONSUME order.confirmed<br/>header: x-correlation-id
        IMS ->> IDB: UPDATE stock (confirmed)
        IMS -->>- Kafka: ack
    end

    %% ─────────────────────────────────────────────────────────────
    %% 2B. SAD PATH — INSUFFICIENT STOCK
    %% ─────────────────────────────────────────────────────────────
    rect rgb(255, 230, 220)
        Note over Kafka,IMR: ❌ Paso 2B — Stock insuficiente
        Kafka ->>+ IMS: CONSUME order.created<br/>header: x-correlation-id
        IMS ->> IDB: BEGIN TX<br/>INSERT outbox_events (inventory.insufficient, correlationId)
        IMS -->>- Kafka: ack

        IMR ->> IDB: findPending()
        IDB -->> IMR: [{ eventType: inventory.insufficient, payload: { correlationId, ... } }]
        IMR ->> Kafka: PUBLISH inventory.insufficient<br/>header: x-correlation-id
        IMR ->> IDB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 3B. ORDER CANCELLED (from inventory.insufficient)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(255, 230, 220)
        Note over Kafka,OMR: ❌ Paso 3B — Orden cancelada por stock
        Kafka ->>+ OMS: CONSUME inventory.insufficient<br/>header: x-correlation-id
        OMS ->> ODB: BEGIN TX<br/>UPDATE order (status=CANCELLED)<br/>INSERT outbox_events (order.cancelled, correlationId)
        OMS -->>- Kafka: ack

        OMR ->> ODB: findPending()
        ODB -->> OMR: [{ eventType: order.cancelled, payload: { correlationId, ... } }]
        OMR ->> Kafka: PUBLISH order.cancelled<br/>header: x-correlation-id
        OMR ->> ODB: markPublished(id)
    end

    %% ─────────────────────────────────────────────────────────────
    %% 4C. STOCK RELEASED (from order.cancelled)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(255, 230, 220)
        Note over Kafka,IMS: ↩️  Paso 4C — Reserva liberada
        Kafka ->>+ IMS: CONSUME order.cancelled<br/>header: x-correlation-id
        IMS ->> IDB: UPDATE stock (release reservation)
        IMS -->>- Kafka: ack
    end

    %% ─────────────────────────────────────────────────────────────
    %% 4D. PAYMENT REJECTED (from order.confirmed — amount > 500 000)
    %% ─────────────────────────────────────────────────────────────
    rect rgb(255, 245, 200)
        Note over Kafka,PMR: ⚠️  Paso 4D — Pago rechazado (totalAmount > 500 000 COP)
        Kafka ->>+ PMS: CONSUME order.confirmed<br/>header: x-correlation-id
        Note right of PMS: SimulatedPaymentGateway<br/>amount > 500 000 → rejected
        PMS ->> PDB: BEGIN TX<br/>INSERT payment (status=REJECTED)<br/>INSERT outbox_events (payment.failed, correlationId)
        PMS -->>- Kafka: ack

        PMR ->> PDB: findPending()
        PDB -->> PMR: [{ eventType: payment.failed, payload: { correlationId, ... } }]
        PMR ->> Kafka: PUBLISH payment.failed<br/>header: x-correlation-id
        PMR ->> PDB: markPublished(id)

        Note over Kafka,OMS: orders-ms no consume payment.failed<br/>(la orden queda en estado CONFIRMED)
    end
```

---

## Tópicos Kafka

| Tópico                    | Publicado por    | Consumido por                   |
|---------------------------|------------------|---------------------------------|
| `order.created`           | orders-ms        | inventory-ms                    |
| `order.confirmed`         | orders-ms        | inventory-ms, payments-ms       |
| `order.cancelled`         | orders-ms        | inventory-ms                    |
| `inventory.validated`     | inventory-ms     | orders-ms                       |
| `inventory.insufficient`  | inventory-ms     | orders-ms                       |
| `payment.processed`       | payments-ms      | orders-ms                       |
| `payment.failed`          | payments-ms      | *(no consumer)*                 |

---

## Flujos resumidos

### ✅ Happy path (stock OK + pago aprobado)
```
POST /orders
  → order.created
    → inventory.validated
      → order.confirmed
        → payment.processed  →  order status: PAID
        → stock confirmed (inventory-ms)
```

### ❌ Stock insuficiente
```
POST /orders
  → order.created
    → inventory.insufficient
      → order.cancelled
        → stock released (inventory-ms)
```

### ⚠️ Pago rechazado (totalAmount > 500 000 COP)
```
POST /orders
  → order.created
    → inventory.validated
      → order.confirmed
        → payment.failed  (orders-ms no consume este evento)
        → stock confirmed (inventory-ms)
```
x