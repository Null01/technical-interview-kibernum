/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { IsInt, IsNumber, Min } from 'class-validator';

export class OrderCreatedEventDto {
  @IsInt()
  orderId: number;

  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.001)
  quantity: number;
}
