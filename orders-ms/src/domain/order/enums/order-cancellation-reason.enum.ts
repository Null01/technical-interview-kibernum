
export enum OrderCancellationReason {
  /** The order stayed in PENDING for too long with no inventory response. */
  PENDING_TIMEOUT     = 'Cancelled by system — order pending for more than 30 minutes without inventory response',

  /** inventory-ms reported there was not enough stock to fulfil the order. */
  INSUFFICIENT_STOCK  = 'Cancelled due to insufficient stock in inventory',

  /** payments-ms rejected the payment (amount exceeded the gateway limit). */
  PAYMENT_FAILED      = 'Cancelled due to payment processing failure',
}
