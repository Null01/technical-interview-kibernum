/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventoryStockModel } from '@domain/inventory/models/inventory-stock.model';
import { InventoryStockRepositoryPort } from '@domain/inventory/ports/inventory-stock.repository.port';
import { MovementType } from '@domain/inventory/enums/movement-type.enum';
import { StockInsufficientException } from '@domain/inventory/exceptions/stock-insufficient.exception';
import { InventoryStockOrmEntity } from '../entities/inventory-stock.orm-entity';
import { StockMovementOrmEntity } from '../entities/stock-movement.orm-entity';
import { InventoryStockMapper } from '../mappers/inventory-stock.mapper';
import { TypeOrmUnitOfWork } from '../unit-of-work.typeorm';

@Injectable()
export class InventoryStockTypeormRepository implements InventoryStockRepositoryPort {
  constructor(
    @InjectRepository(InventoryStockOrmEntity)
    private readonly repo: Repository<InventoryStockOrmEntity>,
    private readonly mapper: InventoryStockMapper,
    private readonly unitOfWork: TypeOrmUnitOfWork,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async hasReservationForOrder(orderId: number): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(StockMovementOrmEntity)
      .countBy({
        type:          MovementType.RESERVATION,
        referenceType: 'order',
        referenceId:   orderId,
      });
    return count > 0;
  }

  async findByProductId(productId: number): Promise<InventoryStockModel | null> {
    const orm = await this.repo.findOneBy({ productId });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async save(stock: InventoryStockModel): Promise<InventoryStockModel> {
    const orm = this.mapper.toOrm(stock);
    const saved = await this.repo.save(orm);
    return this.mapper.toDomain(saved);
  }

  async reserveStock(productId: number, orderId: number, qty: number): Promise<InventoryStockModel> {
    return this.runInTransaction(async manager => {
      const stock = await manager
        .createQueryBuilder(InventoryStockOrmEntity, 's')
        .where('s.product_id = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();

      const reservedBefore = stock ? Number(stock.reservedQty) : 0;
      const physicalQty    = stock ? Number(stock.quantity)    : 0;
      const available      = physicalQty - reservedBefore;

      if (!stock || available < qty) {
        throw new StockInsufficientException(productId, qty, available);
      }

      stock.reservedQty    = reservedBefore + qty;
      stock.lastMovementAt = new Date();
      const saved = await manager.save(InventoryStockOrmEntity, stock);

      await manager.save(
        manager.create(StockMovementOrmEntity, {
          productId,
          type:          MovementType.RESERVATION,
          qtyChange:     qty,
          qtyBefore:     reservedBefore,
          qtyAfter:      reservedBefore + qty,
          referenceType: 'order',
          referenceId:   orderId,
          notes:         `Reserva por orden #${orderId}`,
          createdBy:     'system',
        }),
      );

      return this.mapper.toDomain(saved);
    });
  }

  async confirmReservation(
    productId: number,
    orderId: number,
    qty: number,
  ): Promise<InventoryStockModel | null> {
    return this.runInTransaction(async manager => {
      const stock = await manager
        .createQueryBuilder(InventoryStockOrmEntity, 's')
        .where('s.product_id = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!stock) return null;

      const qtyBefore = Number(stock.quantity);
      const deductQty = Math.min(qty, qtyBefore);

      stock.quantity       = qtyBefore - deductQty;
      stock.reservedQty    = Math.max(0, Number(stock.reservedQty) - qty);
      stock.lastMovementAt = new Date();
      const saved = await manager.save(InventoryStockOrmEntity, stock);

      await manager.save(
        manager.create(StockMovementOrmEntity, {
          productId,
          type:          MovementType.RESERVATION_CONFIRMED,
          qtyChange:     -deductQty,
          qtyBefore,
          qtyAfter:      qtyBefore - deductQty,
          referenceType: 'order',
          referenceId:   orderId,
          notes:         `Confirmación de reserva para orden #${orderId}`,
          createdBy:     'system',
        }),
      );

      return this.mapper.toDomain(saved);
    });
  }

  async releaseReservation(
    productId: number,
    orderId: number,
    qty: number,
  ): Promise<InventoryStockModel | null> {
    return this.runInTransaction(async manager => {
      const stock = await manager
        .createQueryBuilder(InventoryStockOrmEntity, 's')
        .where('s.product_id = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!stock) return null;

      const reservedBefore = Number(stock.reservedQty);
      const releaseQty     = Math.min(qty, reservedBefore);

      if (releaseQty === 0) return this.mapper.toDomain(stock);

      stock.reservedQty    = reservedBefore - releaseQty;
      stock.lastMovementAt = new Date();
      const saved = await manager.save(InventoryStockOrmEntity, stock);

      await manager.save(
        manager.create(StockMovementOrmEntity, {
          productId,
          type:          MovementType.RESERVATION_RELEASED,
          qtyChange:     -releaseQty,
          qtyBefore:     reservedBefore,
          qtyAfter:      reservedBefore - releaseQty,
          referenceType: 'order',
          referenceId:   orderId,
          notes:         `Liberación de reserva para orden #${orderId}`,
          createdBy:     'system',
        }),
      );

      return this.mapper.toDomain(saved);
    });
  }

  private runInTransaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const activeManager = this.unitOfWork.getManager();
    if (activeManager) return fn(activeManager);
    return this.dataSource.transaction(fn);
  }
}
