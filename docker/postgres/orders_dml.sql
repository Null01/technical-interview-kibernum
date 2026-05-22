-- ============================================================
-- orders_db — DML (seed data)
-- ============================================================

\c orders_db;

INSERT INTO orders (product_id, quantity, customer_id, total_amount, status, notes, created_at, updated_at)
SELECT d.product_id, d.quantity, d.customer_id, d.total_amount, d.status::order_status, d.notes, d.created_at, d.updated_at
FROM (VALUES
  -- órdenes pagadas (flujo completo: pending → confirmed → paid)
  (2,  24,  101,  48000.00,  'paid',      NULL::TEXT,                                                       NOW() - INTERVAL '5 days',     NOW() - INTERVAL '4 days'),
  (13, 12,  102,  38400.00,  'paid',      NULL::TEXT,                                                       NOW() - INTERVAL '4 days',     NOW() - INTERVAL '3 days'),
  (5,  50,  103,  160000.00, 'paid',      NULL::TEXT,                                                       NOW() - INTERVAL '3 days',     NOW() - INTERVAL '2 days'),
  -- órdenes confirmadas (inventario ok, esperando pago)
  (1,  48,  104,  57600.00,  'confirmed', NULL::TEXT,                                                       NOW() - INTERVAL '2 days',     NOW() - INTERVAL '1 day'),
  (11, 36,  101,  64800.00,  'confirmed', NULL::TEXT,                                                       NOW() - INTERVAL '1 day',      NOW() - INTERVAL '12 hours'),
  -- órdenes pendientes recientes (esperando respuesta de inventario)
  (14, 24,  105,  60000.00,  'pending',   NULL::TEXT,                                                       NOW() - INTERVAL '2 hours',    NOW() - INTERVAL '2 hours'),
  (3,  60,  102,  90000.00,  'pending',   NULL::TEXT,                                                       NOW() - INTERVAL '1 hour',     NOW() - INTERVAL '1 hour'),
  -- orden pendiente "stale" (> 30 min sin respuesta — candidata al watchdog StaleOrdersJob)
  (7,  10,  106,  35000.00,  'pending',   NULL::TEXT,                                                       NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  -- órdenes canceladas por stock insuficiente
  (15, 30,  103,  165000.00, 'cancelled', 'Cancelled due to insufficient stock in inventory',               NOW() - INTERVAL '6 days',     NOW() - INTERVAL '6 days'),
  (10, 72,  104,  252000.00, 'cancelled', 'Cancelled due to insufficient stock in inventory',               NOW() - INTERVAL '3 days',     NOW() - INTERVAL '3 days'),
  -- orden cancelada por fallo en el procesamiento del pago
  (6,  20,  105,  72000.00,  'cancelled', 'Cancelled due to payment processing failure',                    NOW() - INTERVAL '2 days',     NOW() - INTERVAL '2 days')
) AS d(product_id, quantity, customer_id, total_amount, status, notes, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM orders LIMIT 1);
