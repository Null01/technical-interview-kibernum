/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';
import { CreateOrderCommand } from '@application/order/commands/create-order.command';

export class CreateOrderDto implements CreateOrderCommand {
  /** ID del producto a ordenar */
  @ApiProperty({ example: 42, description: 'ID del producto a ordenar' })
  @IsInt()
  productId: number;

  /** Cantidad solicitada */
  @ApiProperty({ example: 5, description: 'Cantidad solicitada' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  /** ID del cliente que realiza la orden */
  @ApiProperty({ example: 1001, description: 'ID del cliente que realiza la orden' })
  @IsInt()
  customerId: number;

  /** Monto total de la orden */
  @ApiProperty({ example: 25000, description: 'Monto total de la orden (moneda local)' })
  @IsNumber()
  @Min(0)
  totalAmount: number;
}
