/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderCancelledEventDto {
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
