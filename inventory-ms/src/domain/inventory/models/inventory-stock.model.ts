export interface InventoryStockModel {
  id: number;
  productId: number;
  quantity: number;
  reservedQty: number;
  lastMovementAt: Date | null;
  lastCountAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
