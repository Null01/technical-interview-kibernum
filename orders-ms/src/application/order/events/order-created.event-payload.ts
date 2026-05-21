/**
 * Payload published to Kafka (via the Transactional Outbox) when a new order
 * is created.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface OrderCreatedEventPayload {
  orderId:       number;
  productId:     number;
  quantity:      number;
  customerId:    number;
  totalAmount:   number;
  correlationId?: string;
  [key: string]: unknown;
}
