/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { INVENTORY_STOCK_REPOSITORY } from '@domain/inventory/ports/inventory-stock.repository.port';
import type { InventoryStockRepositoryPort } from '@domain/inventory/ports/inventory-stock.repository.port';
import type { ReleaseReservationCommand } from '../commands/release-reservation.command';
import { AppLoggerService } from '../../../infrastructure/common/logging/app-logger.service';

@Injectable()
export class ReleaseStockReservationUseCase {
  private readonly logger = new AppLoggerService(ReleaseStockReservationUseCase.name);

  constructor(
    @Inject(INVENTORY_STOCK_REPOSITORY)
    private readonly stockRepository: InventoryStockRepositoryPort,
  ) {}

  async execute (command: ReleaseReservationCommand): Promise<void> {
    const result = await this.stockRepository.releaseReservation(
      command.productId,
      command.orderId,
      command.quantity,
    );

    if (!result) {
      this.logger.warn(
        `releaseReservation: no stock record found for product ${command.productId} — skipping`,
      );
      return;
    }

    this.logger.log(
      `Reserva liberada para orden #${command.orderId} — reservedQty: ${result.reservedQty}`,
    );
  }
}
