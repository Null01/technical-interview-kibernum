-- ============================================================
-- orders_db — DML (seed data)
-- Tienda de barrio colombiana — órdenes de ejemplo
--
-- Estrategia de idempotencia:
--   · INSERT ... WHERE NOT EXISTS (SELECT 1 FROM orders LIMIT 1)
--     Solo inserta si la tabla está vacía, evitando duplicados
--     en re-ejecuciones.
--
-- Referencia de product_id:
--   Los IDs corresponden a los productos sembrados en inventory_dml.sql:
--     1  → Coca-Cola 250 mL        9  → Salsa de tomate Fruco
--     2  → Coca-Cola 500 mL       10  → Atún Van Camps
--     3  → Postobón Manzana       11  → Papas Papa Noel
--     4  → Agua Cristal           12  → Pan tajado
--     5  → Arroz Diana            13  → Leche Alquería
--     6  → Fríjol Rojo            14  → Yogurt Alpina
--     7  → Azúcar blanca          15  → Queso Doblecrema
--     8  → Sal                    16  → Colgate Total
--                                 17  → Detergente Ariel
--                                 18  → Papel Higiénico Familia
-- ============================================================

\c orders_db;

INSERT INTO orders (product_id, quantity, customer_id, total_amount, status, created_at, updated_at)
SELECT d.product_id, d.quantity, d.customer_id, d.total_amount, d.status::order_status, d.created_at, d.updated_at
FROM (VALUES
  -- órdenes pagadas (flujo completo: pending → confirmed → paid)
  (2,  24,  101,  48000.00, 'paid',      NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  (13, 12,  102,  38400.00, 'paid',      NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  (5,  50,  103,  160000.00,'paid',      NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  -- órdenes confirmadas (inventario ok, esperando pago)
  (1,  48,  104,  57600.00, 'confirmed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
  (11, 36,  101,  64800.00, 'confirmed', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '12 hours'),
  -- órdenes pendientes (recién creadas, esperando inventario)
  (14, 24,  105,  60000.00, 'pending',   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (3,  60,  102,  90000.00, 'pending',   NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '1 hour'),
  -- órdenes canceladas (stock insuficiente)
  (15, 30,  103,  165000.00,'cancelled', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  (10, 72,  104,  252000.00,'cancelled', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
) AS d(product_id, quantity, customer_id, total_amount, status, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM orders LIMIT 1);
