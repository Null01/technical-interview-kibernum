/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@domain/order/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'Nuevo estado de la orden' })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
