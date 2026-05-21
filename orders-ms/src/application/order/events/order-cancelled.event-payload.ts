/**
 * Payload published to Kafka (via the Transactional Outbox) when an order
 * is cancelled, requesting inventory stock to be released.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface OrderCancelledEventPayload {
  orderId:       number;
  productId:     number;
  quantity:      number;
  correlationId?: string;
  [key: string]: unknown;
}
