/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { IsInt } from 'class-validator';

export class InventoryValidatedEventDto {
  @IsInt()
  orderId: number;
}
