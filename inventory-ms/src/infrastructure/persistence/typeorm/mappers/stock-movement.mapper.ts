/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { StockMovementModel } from '@domain/inventory/models/stock-movement.model';
import { StockMovementOrmEntity } from '../entities/stock-movement.orm-entity';

@Injectable()
export class StockMovementMapper {
  toDomain(orm: StockMovementOrmEntity): StockMovementModel {
    return {
      id:            orm.id,
      productId:     orm.productId,
      type:          orm.type,
      qtyChange:     Number(orm.qtyChange),
      qtyBefore:     Number(orm.qtyBefore),
      qtyAfter:      Number(orm.qtyAfter),
      referenceType: orm.referenceType ?? null,
      referenceId:   orm.referenceId ?? null,
      notes:         orm.notes ?? null,
      createdAt:     orm.createdAt,
      createdBy:     orm.createdBy,
    };
  }

  toOrm(domain: Omit<StockMovementModel, 'id' | 'createdAt'>): StockMovementOrmEntity {
    const orm = new StockMovementOrmEntity();
    orm.productId     = domain.productId;
    orm.type          = domain.type;
    orm.qtyChange     = domain.qtyChange;
    orm.qtyBefore     = domain.qtyBefore;
    orm.qtyAfter      = domain.qtyAfter;
    orm.referenceType = domain.referenceType ?? null;
    orm.referenceId   = domain.referenceId ?? null;
    orm.notes         = domain.notes ?? null;
    orm.createdBy     = domain.createdBy;
    return orm;
  }
}
