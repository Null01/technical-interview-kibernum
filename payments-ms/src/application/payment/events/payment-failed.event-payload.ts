/**
 * Payload published to Kafka (via the Transactional Outbox) when a payment
 * is rejected, requesting the order to be cancelled.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface PaymentFailedEventPayload {
  paymentId:      number;
  orderId:        number;
  productId:      number;
  quantity:       number;
  status:         string;
  reason:         string | null;
  correlationId?: string;
  [key: string]:  unknown;
}
