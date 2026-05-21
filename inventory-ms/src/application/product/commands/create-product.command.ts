export interface CreateProductCommand {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  brandId?: number;
  uomId: number;
  purchasePrice: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  isPerishable?: boolean;
  shelfLifeDays?: number;
  requiresRefrigeration?: boolean;
}
