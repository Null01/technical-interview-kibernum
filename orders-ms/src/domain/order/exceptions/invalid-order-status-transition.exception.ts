/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { BusinessException } from '@domain/shared/exceptions/business.exception';
import { OrderStatus } from '../enums/order-status.enum';

export class InvalidOrderStatusTransitionException extends BusinessException {
  readonly errorCode = 'INVALID_ORDER_STATUS_TRANSITION';
  readonly httpStatus = 422;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from '${from}' to '${to}'`);
  }
}
