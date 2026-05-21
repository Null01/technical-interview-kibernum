/**
 * Payload published to Kafka (via the Transactional Outbox) when an order
 * transitions to the CONFIRMED state, requesting payment processing.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface OrderConfirmedEventPayload {
  orderId:       number;
  productId:     number;
  quantity:      number;
  totalAmount:   number;
  customerId:    number;
  correlationId?: string;
  [key: string]: unknown;
}
