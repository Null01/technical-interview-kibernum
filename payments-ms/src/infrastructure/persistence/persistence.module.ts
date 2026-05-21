/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PAYMENT_REPOSITORY } from '@domain/payment/ports/payment.repository.port';
import { UNIT_OF_WORK } from '@domain/shared/ports/unit-of-work.port';
import { PaymentOrmEntity } from './typeorm/entities/payment.orm-entity';
import { OutboxEventOrmEntity } from './typeorm/entities/outbox-event.orm-entity';
import { PaymentMapper } from './typeorm/mappers/payment.mapper';
import { PaymentTypeormRepository } from './typeorm/repositories/payment.typeorm-repository';
import { OutboxTypeormRepository, OUTBOX_REPOSITORY } from './typeorm/repositories/outbox.typeorm-repository';
import { TypeOrmUnitOfWork } from './typeorm/unit-of-work.typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentOrmEntity, OutboxEventOrmEntity])],
  providers: [
    TypeOrmUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: TypeOrmUnitOfWork },

    PaymentMapper,
    PaymentTypeormRepository,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentTypeormRepository },

    OutboxTypeormRepository,
    { provide: OUTBOX_REPOSITORY, useClass: OutboxTypeormRepository },
  ],
  exports: [PAYMENT_REPOSITORY, OUTBOX_REPOSITORY, UNIT_OF_WORK, TypeOrmUnitOfWork],
})
export class PersistenceModule {}
