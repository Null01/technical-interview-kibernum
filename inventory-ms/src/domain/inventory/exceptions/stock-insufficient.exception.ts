/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { BusinessException } from '@domain/shared/exceptions/business.exception';

export class StockInsufficientException extends BusinessException {
  readonly errorCode  = 'STOCK_INSUFFICIENT';
  readonly httpStatus = 422;

  constructor(productId: number, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}: requested ${requested}, available ${available}`,
    );
  }
}
