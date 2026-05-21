import { ProcessPaymentCommand } from '../../src/application/payment/commands/process-payment.command';
import { RejectPaymentCommand }  from '../../src/application/payment/commands/reject-payment.command';

let orderCounter = 0;

/** Genera un comando válido para ProcessPaymentUseCase con orderId único. */
export function buildProcessCommand(
  overrides: Partial<ProcessPaymentCommand> = {},
): ProcessPaymentCommand {
  orderCounter++;
  return {
    orderId:       orderCounter,
    amount:        150_000,
    transactionId: `TXN-TEST-${String(orderCounter).padStart(6, '0')}`,
    currency:      'COP',
    ...overrides,
  };
}

/** Genera un comando válido para RejectPaymentUseCase con orderId único. */
export function buildRejectCommand(
  overrides: Partial<RejectPaymentCommand> = {},
): RejectPaymentCommand {
  orderCounter++;
  return {
    orderId:       orderCounter,
    productId:     1,
    quantity:      5,
    amount:        600_000,
    failureReason: 'Fondos insuficientes — monto supera límite de prueba',
    currency:      'COP',
    ...overrides,
  };
}

/** Cantidad por encima del umbral de rechazo del SimulatedPaymentGateway (500 000 COP). */
export const AMOUNT_REJECTED = 600_000;
/** Cantidad por debajo del umbral de aprobación. */
export const AMOUNT_APPROVED = 150_000;
