import { MovementType } from '../enums/movement-type.enum';

export interface StockMovementModel {
  id: number;
  productId: number;
  type: MovementType;
  qtyChange: number;
  qtyBefore: number;
  qtyAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string;
}
