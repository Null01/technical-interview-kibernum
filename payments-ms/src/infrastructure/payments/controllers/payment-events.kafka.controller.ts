/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Controller, Inject, UseFilters } from '@nestjs/common';
import { EventPattern, Payload }          from '@nestjs/microservices';
import { KafkaExceptionFilter }           from '../../common/filters/kafka-exception.filter';
import { ProcessPaymentUseCase } from '@application/payment/use-cases/process-payment.use-case';
import { RejectPaymentUseCase }  from '@application/payment/use-cases/reject-payment.use-case';
import type { PaymentGatewayPort } from '../../gateway/payment-gateway.port';
import { OrderConfirmedEventDto }  from '../dtos/order-confirmed.event.dto';
import { AppLoggerService }        from '../../common/logging/app-logger.service';

@Controller()
@UseFilters(KafkaExceptionFilter)
export class PaymentEventsKafkaController {
  private readonly logger = new AppLoggerService(PaymentEventsKafkaController.name);

  constructor (
    private readonly processPayment: ProcessPaymentUseCase,
    private readonly rejectPayment: RejectPaymentUseCase,
    @Inject('PAYMENT_GATEWAY')
    private readonly gateway: PaymentGatewayPort,
  ) {}

  @EventPattern(process.env.KAFKA_TOPIC_ORDER_CONFIRMED ?? 'order.confirmed')
  async handleOrderConfirmed (@Payload() data: OrderConfirmedEventDto): Promise<void> {
    this.logger.log(`Procesando pago para orden ${data.orderId} — monto: ${data.totalAmount}`);

    const result = await this.gateway.charge(data.orderId, data.totalAmount);

    if (result.approved) {
      await this.processPayment.execute({
        orderId:       data.orderId,
        amount:        data.totalAmount,
        transactionId: result.transactionId!,
      });
    } else {
      await this.rejectPayment.execute({
        orderId:       data.orderId,
        productId:     data.productId,
        quantity:      data.quantity,
        amount:        data.totalAmount,
        failureReason: result.reason ?? 'Pago rechazado por la pasarela',
      });
    }
  }
}
