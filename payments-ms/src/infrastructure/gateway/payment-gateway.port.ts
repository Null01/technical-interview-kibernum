export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface GatewayChargeResult {
  approved: boolean;
  transactionId: string | null;
  reason: string | null;
}

/**
 * Puerto de la pasarela de pagos.
 * La implementación de producción llamaría a un proveedor real (Stripe, Wompi, etc.).
 * En desarrollo se usa SimulatedPaymentGateway.
 */
export interface PaymentGatewayPort {
  charge (orderId: number, amount: number): Promise<GatewayChargeResult>;
}
