/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INVENTORY_STOCK_REPOSITORY } from '@domain/inventory/ports/inventory-stock.repository.port';
import { STOCK_MOVEMENT_REPOSITORY } from '@domain/inventory/ports/stock-movement.repository.port';
import { PRODUCT_REPOSITORY } from '@domain/product/ports/product.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import { BrandOrmEntity } from './typeorm/entities/brand.orm-entity';
import { CategoryOrmEntity } from './typeorm/entities/category.orm-entity';
import { InventoryStockOrmEntity } from './typeorm/entities/inventory-stock.orm-entity';
import { OutboxEventOrmEntity } from './typeorm/entities/outbox-event.orm-entity';
import { ProductOrmEntity } from './typeorm/entities/product.orm-entity';
import { StockMovementOrmEntity } from './typeorm/entities/stock-movement.orm-entity';
import { UnitOfMeasureOrmEntity } from './typeorm/entities/unit-of-measure.orm-entity';
import { InventoryStockMapper } from './typeorm/mappers/inventory-stock.mapper';
import { ProductMapper } from './typeorm/mappers/product.mapper';
import { StockMovementMapper } from './typeorm/mappers/stock-movement.mapper';
import { InventoryStockTypeormRepository } from './typeorm/repositories/inventory-stock.typeorm-repository';
import { ProductTypeormRepository } from './typeorm/repositories/product.typeorm-repository';
import { StockMovementTypeormRepository } from './typeorm/repositories/stock-movement.typeorm-repository';
import { OutboxTypeormRepository, OUTBOX_REPOSITORY } from './typeorm/repositories/outbox.typeorm-repository';
import { TypeOrmUnitOfWork } from './typeorm/unit-of-work.typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryOrmEntity,
      BrandOrmEntity,
      UnitOfMeasureOrmEntity,
      ProductOrmEntity,
      InventoryStockOrmEntity,
      StockMovementOrmEntity,
      OutboxEventOrmEntity,
    ]),
  ],
  providers: [
    TypeOrmUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: TypeOrmUnitOfWork },

    ProductMapper,
    InventoryStockMapper,
    StockMovementMapper,

    ProductTypeormRepository,
    InventoryStockTypeormRepository,
    StockMovementTypeormRepository,
    OutboxTypeormRepository,

    { provide: PRODUCT_REPOSITORY,         useClass: ProductTypeormRepository },
    { provide: INVENTORY_STOCK_REPOSITORY, useClass: InventoryStockTypeormRepository },
    { provide: STOCK_MOVEMENT_REPOSITORY,  useClass: StockMovementTypeormRepository },
    { provide: OUTBOX_REPOSITORY,          useClass: OutboxTypeormRepository },
  ],
  exports: [
    PRODUCT_REPOSITORY,
    INVENTORY_STOCK_REPOSITORY,
    STOCK_MOVEMENT_REPOSITORY,
    OUTBOX_REPOSITORY,
    UNIT_OF_WORK,
    TypeOrmUnitOfWork,
  ],
})
export class PersistenceModule {}
