/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovementModel } from '@domain/inventory/models/stock-movement.model';
import { StockMovementRepositoryPort } from '@domain/inventory/ports/stock-movement.repository.port';
import { StockMovementOrmEntity } from '../entities/stock-movement.orm-entity';
import { StockMovementMapper } from '../mappers/stock-movement.mapper';

@Injectable()
export class StockMovementTypeormRepository implements StockMovementRepositoryPort {
  constructor(
    @InjectRepository(StockMovementOrmEntity)
    private readonly repo: Repository<StockMovementOrmEntity>,
    private readonly mapper: StockMovementMapper,
  ) {}

  async save(
    movement: Omit<StockMovementModel, 'id' | 'createdAt'>,
  ): Promise<StockMovementModel> {
    const orm = this.mapper.toOrm(movement);
    const saved = await this.repo.save(orm);
    return this.mapper.toDomain(saved);
  }
}
