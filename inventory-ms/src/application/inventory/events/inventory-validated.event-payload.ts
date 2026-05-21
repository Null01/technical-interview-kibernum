/**
 * Payload published to Kafka (via the Transactional Outbox) when stock is
 * successfully reserved for an order, signalling orders-ms to confirm it.
 *
 * `correlationId` is injected automatically by `OutboxTypeormRepository.save()`
 * from the active request context — use cases do not need to populate it.
 */
export interface InventoryValidatedEventPayload {
  orderId:        number;
  productId:      number;
  quantity:       number;
  correlationId?: string;
  [key: string]:  unknown;
}
