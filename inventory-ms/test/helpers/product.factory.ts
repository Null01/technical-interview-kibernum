/**
 * IDs de referencia de la semilla (inventory_dml.sql).
 * No deben ser truncados entre tests — son datos de catálogo.
 */
export const SEED = {
  /** product_id=1 → Coca-Cola 250 mL → stock: 96 und */
  PRODUCT_COCA_250:  1,
  /** product_id=2 → Coca-Cola 500 mL → stock: 60 und */
  PRODUCT_COCA_500:  2,
  /** product_id=5 → Arroz Diana 1 kg → stock: 60 und */
  PRODUCT_ARROZ:     5,
  /** categoryId de 'Gaseosas' (subcategoría de Bebidas) */
  CATEGORY_GASEOSAS: 5,
  /** brandId de Coca-Cola */
  BRAND_COCA_COLA:   1,
  /** uomId de 'Unidad' */
  UOM_UNIDAD:        1,
  /** uomId de 'Mililitro' */
  UOM_ML:            5,
} as const;

export interface CreateProductPayload {
  sku:          string;
  name:         string;
  categoryId:   number;
  uomId:        number;
  purchasePrice: number;
  brandId?:     number;
  barcode?:     string;
  description?: string;
}

/** Prefijo de 5 caracteres único por proceso (base-36 del timestamp de inicio).
 *  Evita colisiones de SKU entre ejecuciones repetidas sin reset de BD. */
const RUN_TAG = Date.now().toString(36).toUpperCase().slice(-5);
let skuCounter = 0;

/** Genera un payload válido para POST /products con un SKU único por invocación. */
export function buildCreateProductPayload(
  overrides: Partial<CreateProductPayload> = {},
): CreateProductPayload {
  skuCounter++;
  return {
    sku:           `TST-${RUN_TAG}-${String(skuCounter).padStart(3, '0')}`,
    name:          `Producto de prueba ${skuCounter}`,
    categoryId:    SEED.CATEGORY_GASEOSAS,
    uomId:         SEED.UOM_UNIDAD,
    purchasePrice: 1500,
    ...overrides,
  };
}
