/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRepositoryPort, SavePaymentPayload } from '@domain/payment/ports/payment.repository.port';
import { PaymentModel } from '@domain/payment/models/payment.model';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';
import { PaymentMapper } from '../mappers/payment.mapper';
import { TypeOrmUnitOfWork } from '../unit-of-work.typeorm';

@Injectable()
export class PaymentTypeormRepository implements PaymentRepositoryPort {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private readonly repo: Repository<PaymentOrmEntity>,
    private readonly mapper: PaymentMapper,
    private readonly unitOfWork: TypeOrmUnitOfWork,
  ) {}

  private getRepo(): Repository<PaymentOrmEntity> {
    const manager = this.unitOfWork.getManager();
    return manager ? manager.getRepository(PaymentOrmEntity) : this.repo;
  }

  async save(payload: SavePaymentPayload): Promise<PaymentModel> {
    const entity = this.getRepo().create(this.mapper.toOrm(payload));
    return this.mapper.toDomain(await this.getRepo().save(entity));
  }

  async findById(id: number): Promise<PaymentModel | null> {
    const entity = await this.getRepo().findOneBy({ id });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByOrderId(orderId: number): Promise<PaymentModel | null> {
    const entity = await this.repo.findOneBy({ orderId });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAll(): Promise<PaymentModel[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map(e => this.mapper.toDomain(e));
  }
}
