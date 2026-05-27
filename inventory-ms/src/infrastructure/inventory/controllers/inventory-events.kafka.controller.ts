/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Controller, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ValidateStockUseCase } from '@application/inventory/use-cases/validate-stock.use-case';
import { ConfirmStockReservationUseCase } from '@application/inventory/use-cases/confirm-stock-reservation.use-case';
import { ReleaseStockReservationUseCase } from '@application/inventory/use-cases/release-stock-reservation.use-case';
import { OrderCreatedEventDto } from '../dtos/order-created.event.dto';
import { OrderConfirmedEventDto } from '../dtos/order-confirmed.event.dto';
import { OrderCancelledEventDto } from '../dtos/order-cancelled.event.dto';
import { PaymentFailedEventDto } from '../dtos/payment-failed.event.dto';
import { KafkaExceptionFilter } from '../../common/filters/kafka-exception.filter';

@Controller()
@UseFilters(KafkaExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class InventoryEventsKafkaController {
  constructor(
    private readonly validateStock: ValidateStockUseCase,
    private readonly confirmReservation: ConfirmStockReservationUseCase,
    private readonly releaseReservation: ReleaseStockReservationUseCase,
  ) {}

  @EventPattern(process.env.KAFKA_TOPIC_ORDER_CREATED ?? 'order.created')
  handleOrderCreated(
    @Payload() data: OrderCreatedEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.validateStock.execute(data);
  }

  @EventPattern(process.env.KAFKA_TOPIC_ORDER_CONFIRMED ?? 'order.confirmed')
  handleOrderConfirmed(
    @Payload() data: OrderConfirmedEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.confirmReservation.execute(data);
  }

  @EventPattern(process.env.KAFKA_TOPIC_ORDER_CANCELLED ?? 'order.cancelled')
  handleOrderCancelled(
    @Payload() data: OrderCancelledEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.releaseReservation.execute(data);
  }

  @EventPattern(process.env.KAFKA_TOPIC_PAYMENT_FAILED ?? 'payment.failed')
  handlePaymentFailed(
    @Payload() data: PaymentFailedEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.releaseReservation.execute(data);
  }
}
