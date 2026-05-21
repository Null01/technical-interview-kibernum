/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable }                                from '@nestjs/common';
import { GatewayChargeResult, PaymentGatewayPort }  from './payment-gateway.port';
import { AppLoggerService }                          from '../common/logging/app-logger.service';

/**
 * Implementación simulada de la pasarela de pagos.
 *
 * Regla de negocio para el entorno de desarrollo / pruebas:
 *   · Montos ≤ 500 000 COP  → aprobado
 *   · Montos >  500 000 COP → rechazado ("Monto supera el límite autorizado")
 *
 * Esto permite probar ambos flujos (process/reject) de forma determinista
 * sin depender de un proveedor externo.
 */
@Injectable()
export class SimulatedPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new AppLoggerService(SimulatedPaymentGateway.name);

  private static readonly APPROVAL_LIMIT = 500_000;

  async charge (orderId: number, amount: number): Promise<GatewayChargeResult> {
    const approved = amount <= SimulatedPaymentGateway.APPROVAL_LIMIT;

    this.logger.log(
      `[gateway-sim] orderId=${orderId} amount=${amount} → ${approved ? 'APPROVED' : 'REJECTED'}`,
    );

    if (approved) {
      return {
        approved:      true,
        transactionId: `txn_${Date.now()}_${orderId}`,
        reason:        null,
      };
    }

    return {
      approved:      false,
      transactionId: null,
      reason:        'Monto supera el límite autorizado',
    };
  }
}
