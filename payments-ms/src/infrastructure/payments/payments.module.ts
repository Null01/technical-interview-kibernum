/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from '@application/payment/use-cases/process-payment.use-case';
import { RejectPaymentUseCase } from '@application/payment/use-cases/reject-payment.use-case';
import { FindPaymentUseCase } from '@application/payment/use-cases/find-payment.use-case';
import { PAYMENT_GATEWAY } from '../gateway/payment-gateway.port';
import { SimulatedPaymentGateway } from '../gateway/simulated-payment.gateway';
import { MessagingModule } from '../messaging/messaging.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { OutboxModule } from '../outbox/outbox.module';
import { HealthHttpController } from './controllers/health.http.controller';
import { PaymentsHttpController } from './controllers/payments.http.controller';
import { PaymentEventsKafkaController } from './controllers/payment-events.kafka.controller';

@Module({
  imports: [PersistenceModule, MessagingModule, OutboxModule],
  controllers: [
    HealthHttpController,
    PaymentsHttpController,
    PaymentEventsKafkaController,
  ],
  providers: [
    ProcessPaymentUseCase,
    RejectPaymentUseCase,
    FindPaymentUseCase,
    SimulatedPaymentGateway,
    { provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway },
  ],
})
export class PaymentsFeatureModule {}
