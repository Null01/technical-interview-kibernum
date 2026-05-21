/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { IsInt, IsString } from 'class-validator';

export class InventoryInsufficientEventDto {
  @IsInt()
  orderId: number;

  @IsString()
  reason: string;
}
