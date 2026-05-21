/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case';
import { FindProductUseCase } from '@application/product/use-cases/find-product.use-case';
import { CreateProductDto } from '../dtos/create-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsHttpController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly findProduct: FindProductUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear producto',
    description: 'Registra un nuevo producto en el catálogo de inventario.',
  })
  @ApiOkResponse({ description: 'Producto creado exitosamente' })
  create(@Body() dto: CreateProductDto) {
    return this.createProduct.execute(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar productos activos',
    description: 'Retorna todos los productos activos con su categoría, marca y unidad de medida.',
  })
  @ApiOkResponse({ description: 'Lista de productos activos' })
  findAll() {
    return this.findProduct.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description: 'Retorna el detalle de un producto específico incluyendo sus relaciones.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del producto', example: 1 })
  @ApiOkResponse({ description: 'Producto encontrado' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findProduct.findById(id);
  }
}
