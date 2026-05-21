/**
 * Payload published to Kafka (via the Transactional Outbox) when a payment
 * is successfully approved.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface PaymentProcessedEventPayload {
  paymentId:      number;
  orderId:        number;
  status:         string;
  transactionId:  string | null;
  correlationId?: string;
  [key: string]:  unknown;
}
