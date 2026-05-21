import { InventoryStockModel } from '../models/inventory-stock.model';

export const INVENTORY_STOCK_REPOSITORY = 'INVENTORY_STOCK_REPOSITORY';

export interface InventoryStockRepositoryPort {
  findByProductId(productId: number): Promise<InventoryStockModel | null>;
  save(stock: InventoryStockModel): Promise<InventoryStockModel>;

  /**
   * Atomically increments reservedQty and records a RESERVATION movement.
   * Throws StockInsufficientException if available stock < qty.
   * Uses a pessimistic write lock to prevent concurrent over-reservation.
   */
  reserveStock(productId: number, orderId: number, qty: number): Promise<InventoryStockModel>;

  /**
   * Atomically decrements both quantity and reservedQty and records a
   * RESERVATION_CONFIRMED movement. No-op (returns null) if no stock record found.
   */
  confirmReservation(productId: number, orderId: number, qty: number): Promise<InventoryStockModel | null>;

  /**
   * Atomically decrements reservedQty and records a RESERVATION_RELEASED movement.
   * No-op (returns null) if no stock record found — idempotent by design.
   */
  releaseReservation(productId: number, orderId: number, qty: number): Promise<InventoryStockModel | null>;
}
