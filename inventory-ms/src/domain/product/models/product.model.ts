export interface ProductModel {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number;
  brandId: number | null;
  uomId: number;
  purchasePrice: number;
  minStock: number;
  maxStock: number | null;
  reorderPoint: number;
  reorderQuantity: number;
  isPerishable: boolean;
  shelfLifeDays: number | null;
  requiresRefrigeration: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
