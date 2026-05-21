/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@domain/order/enums/order-status.enum';

export class FindOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ type: Number, description: 'Filtrar por ID de cliente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({ type: Number, description: 'Filtrar por ID de producto' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'totalAmount'],
    default: 'createdAt',
    description: 'Campo de ordenamiento',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'totalAmount'])
  sortBy?: 'createdAt' | 'updatedAt' | 'totalAmount';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC', description: 'Dirección de ordenamiento' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ type: Number, default: 1, description: 'Número de página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20, description: 'Resultados por página (máx 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
