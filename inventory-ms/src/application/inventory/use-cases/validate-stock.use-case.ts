/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { INVENTORY_STOCK_REPOSITORY } from '@domain/inventory/ports/inventory-stock.repository.port';
import type { InventoryStockRepositoryPort } from '@domain/inventory/ports/inventory-stock.repository.port';
import { StockInsufficientException } from '@domain/inventory/exceptions/stock-insufficient.exception';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox.repository.port';
import type { OutboxRepositoryPort } from '@domain/shared/ports/outbox.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import type { UnitOfWorkPort } from '@domain/shared/ports/unit-of-work.port';
import type { ValidateStockCommand } from '../commands/validate-stock.command';
import { AppLoggerService } from '../../../infrastructure/common/logging/app-logger.service';

@Injectable()
export class ValidateStockUseCase {
  private readonly logger = new AppLoggerService(ValidateStockUseCase.name);

  constructor(
    @Inject(INVENTORY_STOCK_REPOSITORY)
    private readonly stockRepository: InventoryStockRepositoryPort,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute (command: ValidateStockCommand): Promise<void> {
    try {
      await this.unitOfWork.withTransaction(async () => {
        await this.stockRepository.reserveStock(
          command.productId,
          command.orderId,
          command.quantity,
        );

        await this.outboxRepository.save({
          aggregateType: 'inventory',
          aggregateId:   command.productId,
          eventType:     process.env.KAFKA_TOPIC_INVENTORY_VALIDATED ?? 'inventory.validated',
          payload: {
            orderId:   command.orderId,
            productId: command.productId,
            quantity:  command.quantity,
          },
        });
      });

      this.logger.log(`Stock reservado y evento encolado para orden #${command.orderId}`);
    } catch (err) {
      const reason =
        err instanceof StockInsufficientException
          ? err.message
          : 'Error al validar el inventario';

      this.logger.warn(`Stock insuficiente/error para orden #${command.orderId}: ${reason}`);

      await this.unitOfWork.withTransaction(async () => {
        await this.outboxRepository.save({
          aggregateType: 'inventory',
          aggregateId:   command.productId,
          eventType:     process.env.KAFKA_TOPIC_INVENTORY_INSUFFICIENT ?? 'inventory.insufficient',
          payload: {
            orderId:   command.orderId,
            productId: command.productId,
            reason,
          },
        });
      });
    }
  }
}
