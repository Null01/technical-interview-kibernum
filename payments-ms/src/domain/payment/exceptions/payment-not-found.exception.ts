/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { BusinessException } from '../../shared/exceptions/business.exception';

export class PaymentNotFoundException extends BusinessException {
  readonly errorCode = 'PAYMENT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: number) {
    super(`Pago con id ${id} no encontrado`);
  }
}
