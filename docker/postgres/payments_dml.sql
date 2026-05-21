-- ============================================================
-- payments_db — DML (seed data)
-- Tienda de barrio colombiana — pagos de ejemplo
--
-- Idempotencia:
--   Solo inserta si la tabla está vacía (WHERE NOT EXISTS).
-- ============================================================

\c payments_db;

INSERT INTO payments (order_id, amount, currency, status, transaction_id, failure_reason, created_at, updated_at)
SELECT d.order_id, d.amount, d.currency, d.status::payment_status, d.transaction_id, d.failure_reason, d.created_at, d.updated_at
FROM (VALUES
  -- pagos aprobados
  (1,  48000.00, 'COP', 'approved', 'txn_1716000000000_1', NULL,                              NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  (2,  38400.00, 'COP', 'approved', 'txn_1716100000000_2', NULL,                              NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  (3, 160000.00, 'COP', 'approved', 'txn_1716200000000_3', NULL,                              NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  -- pagos rechazados
  (8, 165000.00, 'COP', 'rejected', NULL,                  'Monto supera el límite autorizado', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  (9, 252000.00, 'COP', 'rejected', NULL,                  'Fondos insuficientes',              NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
) AS d(order_id, amount, currency, status, transaction_id, failure_reason, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM payments LIMIT 1);
