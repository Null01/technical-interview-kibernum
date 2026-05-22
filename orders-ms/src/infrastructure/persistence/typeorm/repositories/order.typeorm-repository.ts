/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 *
 * Implementación TypeORM del repositorio de órdenes.
 *
 * Implementa ambos puertos CQRS con una sola clase (CQRS lógico):
 *   · OrderCommandRepositoryPort — operaciones de escritura + lecturas internas
 *     del command side (findById para validar estado, findStalePending para el job).
 *   · OrderQueryRepositoryPort   — operaciones de lectura optimizadas, devuelve
 *     OrderReadModel en lugar del agregado de dominio.
 *
 * En una evolución futura (CQRS físico) se podría extraer una segunda clase
 * que apunte a una réplica de lectura y se registre bajo ORDER_QUERY_REPOSITORY.
 */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { OrderCommandRepositoryPort } from '@domain/order/ports/order-command.repository.port'
import { OrderQueryRepositoryPort, FindOrdersQuery } from '@domain/order/ports/order-query.repository.port'
import { OrderModel } from '@domain/order/models/order.model'
import { OrderReadModel, PaginatedOrderReadModels } from '@domain/order/models/order-read.model'
import { OrderStatus } from '@domain/order/enums/order-status.enum'
import { OrderOrmEntity } from '../entities/order.orm-entity'
import { OrderMapper } from '../mappers/order.mapper'
import { TypeOrmUnitOfWork } from '../unit-of-work.typeorm'

@Injectable()
export class OrderTypeormRepository implements OrderCommandRepositoryPort, OrderQueryRepositoryPort {
  constructor (
    @InjectRepository(OrderOrmEntity)
    private readonly repo: Repository<OrderOrmEntity>,
    private readonly mapper: OrderMapper,
    private readonly unitOfWork: TypeOrmUnitOfWork,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Devuelve el repositorio transaccional si hay una UoW activa; de lo contrario el repo base. */
  private getRepo (): Repository<OrderOrmEntity> {
    const manager = this.unitOfWork.getManager()
    return manager ? manager.getRepository(OrderOrmEntity) : this.repo
  }

  async save (order: Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrderModel> {
    const entity = this.getRepo().create(this.mapper.toOrm(order))
    return this.mapper.toDomain(await this.getRepo().save(entity))
  }

  async findById (id: number): Promise<OrderModel | null> {
    const entity = await this.getRepo().findOneBy({ id })
    return entity ? this.mapper.toDomain(entity) : null
  }

  async updateStatus (id: number, status: OrderStatus, notes?: string): Promise<OrderModel | null> {
    const patch: Partial<OrderOrmEntity> = { status }
    if (notes !== undefined) patch.notes = notes
    await this.getRepo().update(id, patch)
    return this.findById(id)
  }

  async findStalePending (olderThanMinutes: number): Promise<OrderModel[]> {
    const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1_000)
    const entities = await this.repo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(threshold),
      },
    })
    return entities.map(e => this.mapper.toDomain(e))
  }

  async findMany (query: FindOrdersQuery): Promise<PaginatedOrderReadModels> {
    const page    = query.page    ?? 1
    const limit   = query.limit   ?? 20
    const sortBy  = query.sortBy  ?? 'createdAt'
    const sortDir = query.sortDir ?? 'DESC'

    const qb = this.repo
      .createQueryBuilder('order')
      .select('order.id',          'id')
      .addSelect('order.productId',   'productId')
      .addSelect('order.quantity',    'quantity')
      .addSelect('order.customerId',  'customerId')
      .addSelect('order.totalAmount', 'totalAmount')
      .addSelect('order.status',      'status')
      .addSelect('order.notes',       'notes')
      .addSelect('order.createdAt',   'createdAt')
      .addSelect('order.updatedAt',   'updatedAt')

    if (query.status)     qb.andWhere('order.status = :status',         { status:     query.status })
    if (query.customerId) qb.andWhere('order.customerId = :customerId', { customerId: query.customerId })
    if (query.productId)  qb.andWhere('order.productId = :productId',   { productId:  query.productId })

    const total = await qb.getCount()

    const sortColumn: Record<string, string> = {
      createdAt:   'order.createdAt',
      updatedAt:   'order.updatedAt',
      totalAmount: 'order.totalAmount',
    }

    type RawOrderRow = {
      id:          number
      productId:   number
      quantity:    string
      customerId:  number
      totalAmount: string
      status:      string
      notes:       string | null
      createdAt:   Date | string
      updatedAt:   Date | string
    }

    const rows = await qb
      .orderBy(sortColumn[sortBy], sortDir)
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawOrderRow>()


    const data: OrderReadModel[] = rows.map(row => ({
      id:          Number(row.id),
      productId:   Number(row.productId),
      quantity:    Number(row.quantity),
      customerId:  Number(row.customerId),
      totalAmount: Number(row.totalAmount),
      status:      row.status as OrderStatus,
      notes:       row.notes ?? null,
      createdAt:   row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as string),
      updatedAt:   row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as string),
    }))

    return { data, total, page, limit }
  }

}
