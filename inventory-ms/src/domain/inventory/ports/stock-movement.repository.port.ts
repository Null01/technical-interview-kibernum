import { StockMovementModel } from '../models/stock-movement.model';

export const STOCK_MOVEMENT_REPOSITORY = 'STOCK_MOVEMENT_REPOSITORY';

export interface StockMovementRepositoryPort {
  save(movement: Omit<StockMovementModel, 'id' | 'createdAt'>): Promise<StockMovementModel>;
}
