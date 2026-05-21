/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { BusinessException } from '@domain/shared/exceptions/business.exception';

export class ProductNotFoundException extends BusinessException {
  readonly errorCode = 'PRODUCT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: number) {
    super(`Product with id ${id} not found`);
  }
}
