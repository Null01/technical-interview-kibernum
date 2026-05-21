/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FindPaymentUseCase } from '@application/payment/use-cases/find-payment.use-case';

@ApiTags('payments')
@Controller('payments')
export class PaymentsHttpController {
  constructor(private readonly findPayment: FindPaymentUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los pagos' })
  @ApiOkResponse({ description: 'Lista de pagos' })
  findAll() {
    return this.findPayment.findAll();
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Obtener pago por ID de orden' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiOkResponse({ description: 'Pago encontrado' })
  @ApiNotFoundResponse({ description: 'No existe pago para esta orden' })
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.findPayment.findByOrderId(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Pago encontrado' })
  @ApiNotFoundResponse({ description: 'Pago no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findPayment.findById(id);
  }
}
