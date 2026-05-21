/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConfirmOrderUseCase } from '@application/order/use-cases/confirm-order.use-case';
import { CancelOrderUseCase } from '@application/order/use-cases/cancel-order.use-case';
import { CompleteOrderUseCase } from '@application/order/use-cases/complete-order.use-case';
import { InventoryValidatedEventDto } from '../dtos/inventory-validated.event.dto';
import { InventoryInsufficientEventDto } from '../dtos/inventory-insufficient.event.dto';
import { PaymentProcessedEventDto } from '../dtos/payment-processed.event.dto';

@Controller()
export class OrderEventsKafkaController {
  constructor(
    private readonly confirmOrder: ConfirmOrderUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
    private readonly completeOrder: CompleteOrderUseCase,
  ) {}

  @EventPattern(process.env.KAFKA_TOPIC_INVENTORY_VALIDATED ?? 'inventory.validated')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleInventoryValidated(
    @Payload() data: InventoryValidatedEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.confirmOrder.execute(data.orderId);
  }

  @EventPattern(process.env.KAFKA_TOPIC_INVENTORY_INSUFFICIENT ?? 'inventory.insufficient')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleInventoryInsufficient(
    @Payload() data: InventoryInsufficientEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.cancelOrder.execute(data.orderId);
  }

  @EventPattern(process.env.KAFKA_TOPIC_PAYMENT_PROCESSED ?? 'payment.processed')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handlePaymentProcessed(
    @Payload() data: PaymentProcessedEventDto,
    @Ctx() _ctx: KafkaContext,
  ) {
    return this.completeOrder.execute(data.orderId);
  }
}
