/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER_REPOSITORY } from '@domain/order/ports/order.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import { OrderOrmEntity } from './typeorm/entities/order.orm-entity';
import { OutboxEventOrmEntity } from './typeorm/entities/outbox-event.orm-entity';
import { OrderMapper } from './typeorm/mappers/order.mapper';
import { OrderTypeormRepository } from './typeorm/repositories/order.typeorm-repository';
import { OutboxTypeormRepository, OUTBOX_REPOSITORY } from './typeorm/repositories/outbox.typeorm-repository';
import { TypeOrmUnitOfWork } from './typeorm/unit-of-work.typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity, OutboxEventOrmEntity])],
  providers: [
    TypeOrmUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: TypeOrmUnitOfWork },

    OrderMapper,
    OrderTypeormRepository,
    { provide: ORDER_REPOSITORY, useClass: OrderTypeormRepository },

    OutboxTypeormRepository,
    { provide: OUTBOX_REPOSITORY, useClass: OutboxTypeormRepository },
  ],
  exports: [ORDER_REPOSITORY, OUTBOX_REPOSITORY, UNIT_OF_WORK, TypeOrmUnitOfWork],
})
export class PersistenceModule {}
