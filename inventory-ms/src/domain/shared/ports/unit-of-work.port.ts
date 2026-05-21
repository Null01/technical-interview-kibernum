export const UNIT_OF_WORK = 'UNIT_OF_WORK';

export interface UnitOfWorkPort {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
