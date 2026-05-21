/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { CreateOrderUseCase } from '@application/order/use-cases/create-order.use-case';
import { FindOrderUseCase } from '@application/order/use-cases/find-order.use-case';
import { ConfirmOrderUseCase } from '@application/order/use-cases/confirm-order.use-case';
import { CancelOrderUseCase } from '@application/order/use-cases/cancel-order.use-case';
import { CompleteOrderUseCase } from '@application/order/use-cases/complete-order.use-case';
import { UpdateOrderStatusUseCase } from '@application/order/use-cases/update-order-status.use-case';
import { CommonModule }      from '../common/common.module';
import { MessagingModule }   from '../messaging/messaging.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { OutboxModule }      from '../outbox/outbox.module';
import { HealthHttpController } from './controllers/health.http.controller';
import { OrdersHttpController } from './controllers/orders.http.controller';
import { OrderEventsKafkaController } from './controllers/order-events.kafka.controller';

@Module({
  imports: [CommonModule, PersistenceModule, MessagingModule, OutboxModule],
  controllers: [
    OrdersHttpController,
    HealthHttpController,
    OrderEventsKafkaController,
  ],
  providers: [
    CreateOrderUseCase,
    FindOrderUseCase,
    ConfirmOrderUseCase,
    CancelOrderUseCase,
    CompleteOrderUseCase,
    UpdateOrderStatusUseCase,
  ],
})
export class OrdersFeatureModule {}
