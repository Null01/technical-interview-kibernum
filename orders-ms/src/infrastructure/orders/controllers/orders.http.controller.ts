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
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { UpdateOrderStatusUseCase } from '@application/order/use-cases/update-order-status.use-case';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { FindOrdersQueryDto } from '../dtos/find-orders-query.dto';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersHttpController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly findOrder: FindOrderUseCase,
    private readonly updateOrderStatus: UpdateOrderStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear orden',
    description:
      'Crea una nueva orden con estado `pending` y emite el evento `order.created` hacia Kafka para que inventory-ms valide el stock.',
  })
  @ApiOkResponse({ description: 'Orden creada exitosamente' })
  create(@Body() dto: CreateOrderDto) {
    return this.createOrder.execute(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar órdenes',
    description:
      'Retorna órdenes paginadas con soporte de filtros por `status`, `customerId`, `productId`, ordenamiento y paginación.',
  })
  @ApiOkResponse({ description: 'Lista paginada de órdenes' })
  findMany(@Query() query: FindOrdersQueryDto) {
    return this.findOrder.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden', example: 1 })
  @ApiOkResponse({ description: 'Orden encontrada' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findOrder.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar estado de una orden',
    description:
      'Transiciones válidas: `pending→confirmed`, `pending→cancelled`, `confirmed→paid`, `confirmed→cancelled`. ' +
      'Al confirmar, emite `order.confirmed` hacia Kafka para que payments-ms procese el pago.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden', example: 1 })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Transición de estado inválida' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatus.execute(id, dto.status);
  }
}
