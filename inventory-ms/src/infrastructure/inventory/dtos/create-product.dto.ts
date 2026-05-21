/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CreateProductCommand } from '@application/product/commands/create-product.command';

export class CreateProductDto implements CreateProductCommand {
  /** Código interno único del producto (Stock Keeping Unit) */
  @ApiProperty({ example: 'BEB-COK-500', description: 'Código SKU único del producto' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  sku: string;

  /** Código de barras EAN-13 o UPC; omitir si no aplica */
  @ApiPropertyOptional({ example: '7702036040248', description: 'Código de barras EAN-13 o UPC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  /** Nombre comercial completo */
  @ApiProperty({ example: 'Coca-Cola 500 mL', description: 'Nombre comercial del producto' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  /** Descripción extendida o especificaciones */
  @ApiPropertyOptional({ example: 'Bebida gaseosa sabor cola', description: 'Descripción extendida del producto' })
  @IsOptional()
  @IsString()
  description?: string;

  /** ID de la categoría */
  @ApiProperty({ example: 5, description: 'ID de la categoría a la que pertenece el producto' })
  @IsInt()
  categoryId: number;

  /** ID de la marca; omitir si es genérico */
  @ApiPropertyOptional({ example: 1, description: 'ID de la marca (nullable para productos genéricos)' })
  @IsOptional()
  @IsInt()
  brandId?: number;

  /** ID de la unidad de medida base */
  @ApiProperty({ example: 5, description: 'ID de la unidad de medida base para el stock' })
  @IsInt()
  uomId: number;

  /** Costo de compra al proveedor */
  @ApiProperty({ example: 2000, description: 'Precio de compra al proveedor (moneda local)' })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  /** Stock mínimo permitido antes de generar alerta */
  @ApiPropertyOptional({ example: 24, description: 'Stock mínimo; por debajo genera alerta de bajo inventario' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  /** Capacidad máxima de almacenamiento */
  @ApiPropertyOptional({ example: 96, description: 'Stock máximo permitido en inventario' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;

  /** Cantidad que dispara una orden de reposición */
  @ApiPropertyOptional({ example: 36, description: 'Cantidad en la que se debe generar una orden de reposición' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  /** Cantidad estándar a solicitar en cada reposición */
  @ApiPropertyOptional({ example: 48, description: 'Cantidad a pedir en cada reposición' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  /** TRUE si el producto tiene fecha de vencimiento */
  @ApiPropertyOptional({ example: false, description: 'Indica si el producto maneja lotes con fecha de vencimiento' })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  /** Vida útil en días desde fabricación */
  @ApiPropertyOptional({ example: 365, description: 'Vida útil en días desde la fecha de fabricación (solo para perecederos)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  shelfLifeDays?: number;

  /** TRUE si requiere almacenamiento en frío */
  @ApiPropertyOptional({ example: false, description: 'Indica si el producto debe almacenarse en refrigeración' })
  @IsOptional()
  @IsBoolean()
  requiresRefrigeration?: boolean;
}
