/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import { UnitOfWorkPort } from '@domain/shared/ports/unit-of-work.port';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWorkPort {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(manager =>
      this.storage.run(manager, fn),
    );
  }

  /** Retorna el EntityManager activo si estamos dentro de withTransaction, undefined en caso contrario. */
  getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }
}
