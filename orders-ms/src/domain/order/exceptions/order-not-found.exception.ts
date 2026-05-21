/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { BusinessException } from '@domain/shared/exceptions/business.exception';

export class OrderNotFoundException extends BusinessException {
  readonly errorCode = 'ORDER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: number) {
    super(`Order with id ${id} not found`);
  }
}
