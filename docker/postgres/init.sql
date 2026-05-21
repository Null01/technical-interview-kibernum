-- ============================================================
-- Inicialización del servidor PostgreSQL
-- Crea las bases de datos de los tres microservicios.
--
-- Idempotencia:
--   PostgreSQL no soporta CREATE DATABASE IF NOT EXISTS.
--   Se usa \gexec para ejecutar el CREATE solo cuando la DB
--   no existe, evitando errores en re-ejecuciones.
-- ============================================================

SELECT 'CREATE DATABASE inventory_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_db')\gexec

SELECT 'CREATE DATABASE orders_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'orders_db')\gexec

SELECT 'CREATE DATABASE payments_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'payments_db')\gexec
