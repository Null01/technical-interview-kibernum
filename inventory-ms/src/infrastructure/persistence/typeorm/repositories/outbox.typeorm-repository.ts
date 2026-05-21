/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OUTBOX_REPOSITORY, OutboxRepositoryPort, SaveOutboxEventPayload } from '@domain/shared/ports/outbox.repository.port';
import { OutboxEventModel } from '@domain/shared/outbox/models/outbox-event.model';
import { OutboxEventStatus } from '@domain/shared/outbox/enums/outbox-event-status.enum';
import { OutboxEventOrmEntity } from '../entities/outbox-event.orm-entity';
import { TypeOrmUnitOfWork } from '../unit-of-work.typeorm';

export { OUTBOX_REPOSITORY };

@Injectable()
export class OutboxTypeormRepository implements OutboxRepositoryPort {
  constructor(
    @InjectRepository(OutboxEventOrmEntity)
    private readonly repo: Repository<OutboxEventOrmEntity>,
    private readonly unitOfWork: TypeOrmUnitOfWork,
  ) {}

  private getRepo(): Repository<OutboxEventOrmEntity> {
    const manager = this.unitOfWork.getManager();
    return manager ? manager.getRepository(OutboxEventOrmEntity) : this.repo;
  }

  async save(event: SaveOutboxEventPayload): Promise<void> {
    const entity = this.getRepo().create({
      ...event,
      status:       OutboxEventStatus.PENDING,
      retries:      0,
      errorMessage: null,
      publishedAt:  null,
    });
    await this.getRepo().save(entity);
  }

  async findPending(limit: number): Promise<OutboxEventModel[]> {
    const entities = await this.repo.find({
      where: { status: OutboxEventStatus.PENDING },
      order: { createdAt: 'ASC' },
      take:  limit,
    });
    return entities.map(this.toDomain);
  }

  async markPublished(id: number): Promise<void> {
    await this.repo.update(id, { status: OutboxEventStatus.PUBLISHED, publishedAt: new Date() });
  }

  async markFailed(id: number, errorMessage: string): Promise<void> {
    await this.repo.increment({ id }, 'retries', 1);
    await this.repo.update(id, { status: OutboxEventStatus.FAILED, errorMessage });
  }

  private toDomain(e: OutboxEventOrmEntity): OutboxEventModel {
    return {
      id:            e.id,
      aggregateType: e.aggregateType,
      aggregateId:   e.aggregateId,
      eventType:     e.eventType,
      payload:       e.payload,
      status:        e.status,
      retries:       e.retries,
      errorMessage:  e.errorMessage,
      createdAt:     e.createdAt,
      publishedAt:   e.publishedAt,
    };
  }
}
