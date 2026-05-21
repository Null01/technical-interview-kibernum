import { IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Payload del evento `payment.failed` producido por payments-ms.
 * inventory-ms lo consume para liberar la reserva de stock asociada a la orden.
 */
export class PaymentFailedEventDto {
  @IsInt()
  @Type(() => Number)
  orderId: number;

  @IsInt()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number;
}
