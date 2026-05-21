/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
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

  /** Logical service name (e.g. "inventory-ms"). */
  service?: string;

  /** Kafka topic. Populated for Kafka messages only. */
  kafkaTopic?: string;

  /** Kafka partition number. Populated for Kafka messages only. */
  kafkaPartition?: number;

  /** Kafka message offset. Populated for Kafka messages only. */
  kafkaOffset?: string;
}
