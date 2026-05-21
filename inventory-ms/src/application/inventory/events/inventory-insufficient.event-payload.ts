/**
 * Payload published to Kafka (via the Transactional Outbox) when stock is
 * insufficient or an error occurs, signalling orders-ms to cancel the order.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface InventoryInsufficientEventPayload {
  orderId:        number;
  productId:      number;
  reason:         string;
  correlationId?: string;
  [key: string]:  unknown;
}
