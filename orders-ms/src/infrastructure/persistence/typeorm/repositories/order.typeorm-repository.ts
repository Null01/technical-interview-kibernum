/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRepositoryPort, FindOrdersQuery, PaginatedOrders } from '@domain/order/ports/order.repository.port';
import { OrderModel } from '@domain/order/models/order.model';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { OrderOrmEntity } from '../entities/order.orm-entity';
import { OrderMapper } from '../mappers/order.mapper';
import { TypeOrmUnitOfWork } from '../unit-of-work.typeorm';

@Injectable()
export class OrderTypeormRepository implements OrderRepositoryPort {
  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly repo: Repository<OrderOrmEntity>,
    private readonly mapper: OrderMapper,
    private readonly unitOfWork: TypeOrmUnitOfWork,
  ) {}

  private getRepo(): Repository<OrderOrmEntity> {
    const manager = this.unitOfWork.getManager();
    return manager ? manager.getRepository(OrderOrmEntity) : this.repo;
  }

  async save(order: Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderModel> {
    const entity = this.getRepo().create(this.mapper.toOrm(order));
    return this.mapper.toDomain(await this.getRepo().save(entity));
  }

  async findMany(query: FindOrdersQuery): Promise<PaginatedOrders> {
    const page    = query.page    ?? 1;
    const limit   = query.limit   ?? 20;
    const sortBy  = query.sortBy  ?? 'createdAt';
    const sortDir = query.sortDir ?? 'DESC';

    const columnMap: Record<string, string> = {
      createdAt:   'order.created_at',
      updatedAt:   'order.updated_at',
      totalAmount: 'order.total_amount',
    };

    const qb = this.repo.createQueryBuilder('order');

    if (query.status)     qb.andWhere('order.status = :status',          { status: query.status });
    if (query.customerId) qb.andWhere('order.customer_id = :customerId', { customerId: query.customerId });
    if (query.productId)  qb.andWhere('order.product_id = :productId',   { productId: query.productId });

    qb.orderBy(columnMap[sortBy], sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [entities, total] = await qb.getManyAndCount();

    return { data: entities.map(e => this.mapper.toDomain(e)), total, page, limit };
  }

  async findById(id: number): Promise<OrderModel | null> {
    const entity = await this.getRepo().findOneBy({ id });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<OrderModel | null> {
    await this.getRepo().update(id, { status });
    return this.findById(id);
  }
}
