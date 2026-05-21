/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { CreateProductUseCase } from '@application/product/use-cases/create-product.use-case';
import { FindProductUseCase } from '@application/product/use-cases/find-product.use-case';
import { ValidateStockUseCase } from '@application/inventory/use-cases/validate-stock.use-case';
import { ConfirmStockReservationUseCase } from '@application/inventory/use-cases/confirm-stock-reservation.use-case';
import { ReleaseStockReservationUseCase } from '@application/inventory/use-cases/release-stock-reservation.use-case';
import { MessagingModule } from '../messaging/messaging.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { OutboxModule } from '../outbox/outbox.module';
import { HealthHttpController } from './controllers/health.http.controller';
import { InventoryEventsKafkaController } from './controllers/inventory-events.kafka.controller';
import { ProductsHttpController } from './controllers/products.http.controller';

@Module({
  imports: [PersistenceModule, MessagingModule, OutboxModule],
  controllers: [
    ProductsHttpController,
    HealthHttpController,
    InventoryEventsKafkaController,
  ],
  providers: [
    CreateProductUseCase,
    FindProductUseCase,
    ValidateStockUseCase,
    ConfirmStockReservationUseCase,
    ReleaseStockReservationUseCase,
  ],
})
export class InventoryFeatureModule {}
