# Event-Driven Sequence Diagram

Comunicación entre microservicios mediante Apache Kafka.

---

## Flujo de eventos

```mermaid
sequenceDiagram
    autonumber

    actor  Client as 🧑‍💻 Client
    participant OMS as orders-ms
    participant Kafka as Apache Kafka
    participant IMS as inventory-ms
    participant PMS as payments-ms

    Note over OMS,PMS: Toda publicación a Kafka pasa por el Transactional Outbox.<br/>El correlationId viaja en el header x-correlation-id de cada mensaje.

    Client ->>+ OMS: POST /orders
    OMS -->>- Client: 201 Created { orderId }
    OMS -) Kafka: order.created

    Kafka -) IMS: order.created

    alt Stock disponible
        IMS -) Kafka: inventory.validated
        Kafka -) OMS: inventory.validated
        OMS -) Kafka: order.confirmed

        Kafka -) IMS: order.confirmed
        Note right of IMS: Confirma reserva de stock

        Kafka -) PMS: order.confirmed

        alt Pago aprobado (amount ≤ 500 000 COP)
            PMS -) Kafka: payment.processed
            Kafka -) OMS: payment.processed
            Note right of OMS: order → PAID
        else Pago rechazado (amount > 500 000 COP)
            PMS -) Kafka: payment.failed
            Note right of PMS: orders-ms no consume este evento
        end

    else Stock insuficiente
        IMS -) Kafka: inventory.insufficient
        Kafka -) OMS: inventory.insufficient
        OMS -) Kafka: order.cancelled
        Note right of OMS: order → CANCELLED
        Kafka -) IMS: order.cancelled
        Note right of IMS: Libera reserva de stock
    end
```

---

## Tópicos Kafka

| Tópico                   | Publicado por | Consumido por             |
|--------------------------|---------------|---------------------------|
| `order.created`          | orders-ms     | inventory-ms              |
| `order.confirmed`        | orders-ms     | inventory-ms, payments-ms |
| `order.cancelled`        | orders-ms     | inventory-ms              |
| `inventory.validated`    | inventory-ms  | orders-ms                 |
| `inventory.insufficient` | inventory-ms  | orders-ms                 |
| `payment.processed`      | payments-ms   | inventory-ms, orders-ms   |
| `payment.failed`         | payments-ms   | inventory-ms, orders-ms   |       
