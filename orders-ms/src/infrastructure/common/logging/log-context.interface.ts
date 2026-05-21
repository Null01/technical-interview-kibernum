/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */

/**
 * Distributed-tracing context propagated via AsyncLocalStorage.
 *
 * Fields are populated at different lifecycle stages:
 *  - transactionId  → always (generated per incoming request/message in THIS service)
 *  - correlationId  → always (propagated via X-Correlation-ID header; equals transactionId
 *                     when this service is the originator)
 *  - spanId         → optional (set for sub-operations: DB calls, outbox publish, etc.)
 *  - service        → always (service name, e.g. "orders-ms")
 *  - environment    → always (NODE_ENV)
 *  - http*          → only during HTTP request handling
 *  - kafka*         → only during Kafka message handling
 */
export interface LogContext {
  /** UUID generated for every incoming request/message within this service. */
  transactionId: string;

  /**
   * Cross-service trace identifier.
   * Propagated via the HTTP header X-Correlation-ID or Kafka message header.
   * When this service initiates the flow, correlationId === transactionId.
   */
  correlationId: string;

  /** Optional sub-operation identifier for fine-grained tracing. */
  spanId?: string;

  /** Logical service name (e.g. "orders-ms"). */
  service?: string;

  /** Kafka topic. Populated for Kafka messages only. */
  kafkaTopic?: string;

  /** Kafka partition number. Populated for Kafka messages only. */
  kafkaPartition?: number;

  /** Kafka message offset. Populated for Kafka messages only. */
  kafkaOffset?: string;
}
