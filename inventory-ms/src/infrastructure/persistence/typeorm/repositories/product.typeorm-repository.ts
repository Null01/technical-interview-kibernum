/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductModel } from '@domain/product/models/product.model';
import { ProductRepositoryPort } from '@domain/product/ports/product.repository.port';
import { ProductOrmEntity } from '../entities/product.orm-entity';
import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class ProductTypeormRepository implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
    private readonly mapper: ProductMapper,
  ) {}

  async findById(id: number): Promise<ProductModel | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? this.mapper.toDomain(orm) : null;
  }

  async findAll(): Promise<ProductModel[]> {
    const orms = await this.repo.find({ where: { isActive: true } });
    return orms.map((o) => this.mapper.toDomain(o));
  }

  async save(product: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductModel> {
    const orm = this.mapper.toOrm(product);
    const saved = await this.repo.save(orm);
    return this.mapper.toDomain(saved);
  }
}
