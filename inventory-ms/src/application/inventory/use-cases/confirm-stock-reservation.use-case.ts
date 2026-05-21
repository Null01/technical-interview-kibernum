/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { INVENTORY_STOCK_REPOSITORY } from '@domain/inventory/ports/inventory-stock.repository.port';
import type { InventoryStockRepositoryPort } from '@domain/inventory/ports/inventory-stock.repository.port';
import type { ConfirmReservationCommand } from '../commands/confirm-reservation.command';

@Injectable()
export class ConfirmStockReservationUseCase {
  private readonly logger = new Logger(ConfirmStockReservationUseCase.name);

  constructor(
    @Inject(INVENTORY_STOCK_REPOSITORY)
    private readonly stockRepository: InventoryStockRepositoryPort,
  ) {}

  async execute(command: ConfirmReservationCommand): Promise<void> {
    const result = await this.stockRepository.confirmReservation(
      command.productId,
      command.orderId,
      command.quantity,
    );

    if (!result) {
      this.logger.warn(
        `confirmReservation: no stock record found for product ${command.productId} — skipping`,
      );
      return;
    }

    this.logger.log(
      `Reserva confirmada para orden #${command.orderId} — stock físico: ${result.quantity}`,
    );
  }
}
