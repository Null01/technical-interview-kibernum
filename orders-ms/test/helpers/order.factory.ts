import { OrderStatus } from '../../src/domain/order/enums/order-status.enum';

// ─── Payload de creación ──────────────────────────────────────────────────────

export interface CreateOrderPayload {
  productId:   number;
  quantity:    number;
  customerId:  number;
  totalAmount: number;
}

/**
 * Construye un payload válido para `POST /orders`.
 * Los valores por defecto son suficientes para crear una orden sin validación
 * de inventario real (usamos product IDs de la semilla del inventory_db).
 */
export function buildCreateOrderPayload(
  overrides: Partial<CreateOrderPayload> = {},
): CreateOrderPayload {
  return {
    productId:   1,
    quantity:    5,
    customerId:  1001,
    totalAmount: 12500,
    ...overrides,
  };
}

// ─── Constantes de escenarios ─────────────────────────────────────────────────

/** IDs de clientes disponibles para tests (no requieren existir en otra tabla). */
export const CUSTOMER = {
  ALICE: 1001,
  BOB:   1002,
  CAROL: 1003,
} as const;

/** Cantidad de orders suficiente para probar paginación. */
export const PAGEABLE_COUNT = 5;

/** Estado de orden esperado tras creación. */
export const INITIAL_STATUS = OrderStatus.PENDING;
