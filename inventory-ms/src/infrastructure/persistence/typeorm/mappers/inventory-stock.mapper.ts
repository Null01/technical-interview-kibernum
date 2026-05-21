/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InventoryStockModel } from '@domain/inventory/models/inventory-stock.model';
import { InventoryStockOrmEntity } from '../entities/inventory-stock.orm-entity';

@Injectable()
export class InventoryStockMapper {
  toDomain(orm: InventoryStockOrmEntity): InventoryStockModel {
    return {
      id:             orm.id,
      productId:      orm.productId,
      quantity:       Number(orm.quantity),
      reservedQty:    Number(orm.reservedQty),
      lastMovementAt: orm.lastMovementAt ?? null,
      lastCountAt:    orm.lastCountAt ?? null,
      createdAt:      orm.createdAt,
      updatedAt:      orm.updatedAt,
      createdBy:      orm.createdBy,
      updatedBy:      orm.updatedBy,
    };
  }

  toOrm(domain: InventoryStockModel): InventoryStockOrmEntity {
    const orm = new InventoryStockOrmEntity();
    orm.id             = domain.id;
    orm.productId      = domain.productId;
    orm.quantity       = domain.quantity;
    orm.reservedQty    = domain.reservedQty;
    orm.lastMovementAt = domain.lastMovementAt ?? null;
    orm.lastCountAt    = domain.lastCountAt ?? null;
    orm.createdBy      = domain.createdBy;
    orm.updatedBy      = domain.updatedBy;
    return orm;
  }
}
