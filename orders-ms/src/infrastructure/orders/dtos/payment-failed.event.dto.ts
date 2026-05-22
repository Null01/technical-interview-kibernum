import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentFailedEventDto {
  @IsInt()
  @Type(() => Number)
  orderId: number;
}
