/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { ProductModel } from '@domain/product/models/product.model';
import { ProductOrmEntity } from '../entities/product.orm-entity';

@Injectable()
export class ProductMapper {
  toDomain(orm: ProductOrmEntity): ProductModel {
    return {
      id:                   orm.id,
      sku:                  orm.sku,
      barcode:              orm.barcode ?? null,
      name:                 orm.name,
      description:          orm.description ?? null,
      categoryId:           orm.categoryId,
      brandId:              orm.brandId ?? null,
      uomId:                orm.uomId,
      purchasePrice:        Number(orm.purchasePrice),
      minStock:             Number(orm.minStock),
      maxStock:             orm.maxStock != null ? Number(orm.maxStock) : null,
      reorderPoint:         Number(orm.reorderPoint),
      reorderQuantity:      Number(orm.reorderQuantity),
      isPerishable:         orm.isPerishable,
      shelfLifeDays:        orm.shelfLifeDays ?? null,
      requiresRefrigeration: orm.requiresRefrigeration,
      isActive:             orm.isActive,
      createdAt:            orm.createdAt,
      updatedAt:            orm.updatedAt,
      createdBy:            orm.createdBy,
      updatedBy:            orm.updatedBy,
    };
  }

  toOrm(domain: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>): ProductOrmEntity {
    const orm = new ProductOrmEntity();
    orm.sku                  = domain.sku;
    orm.barcode              = domain.barcode ?? null;
    orm.name                 = domain.name;
    orm.description          = domain.description ?? null;
    orm.categoryId           = domain.categoryId;
    orm.brandId              = domain.brandId ?? null;
    orm.uomId                = domain.uomId;
    orm.purchasePrice        = domain.purchasePrice;
    orm.minStock             = domain.minStock;
    orm.maxStock             = domain.maxStock ?? null;
    orm.reorderPoint         = domain.reorderPoint;
    orm.reorderQuantity      = domain.reorderQuantity;
    orm.isPerishable         = domain.isPerishable;
    orm.shelfLifeDays        = domain.shelfLifeDays ?? null;
    orm.requiresRefrigeration = domain.requiresRefrigeration;
    orm.isActive             = domain.isActive;
    orm.createdBy            = domain.createdBy;
    orm.updatedBy            = domain.updatedBy;
    return orm;
  }
}
