/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { IsInt, IsNumber, Min } from 'class-validator';

/**
 * Payload del evento `order.confirmed` producido por orders-ms.
 * payments-ms lo consume para iniciar el proceso de cobro.
 */
export class OrderConfirmedEventDto {
  @IsInt()
  orderId: number;

  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @IsInt()
  customerId: number;
}
