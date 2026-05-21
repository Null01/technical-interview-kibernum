-- ============================================================
-- inventory_db — DML (seed data)
-- Tienda de barrio colombiana
--
-- Idempotencia: ON CONFLICT (...) DO NOTHING en tablas con UNIQUE.
-- ============================================================

\c inventory_db;

-- ── Unidades de medida ─────────────────────────────────────────────────────

INSERT INTO units_of_measure (name, abbreviation, type, created_by, updated_by) VALUES
  ('Unidad',    'und',  'UNIT',   'seed', 'seed'),
  ('Kilogramo', 'kg',   'MASS',   'seed', 'seed'),
  ('Gramo',     'g',    'MASS',   'seed', 'seed'),
  ('Litro',     'L',    'VOLUME', 'seed', 'seed'),
  ('Mililitro', 'mL',   'VOLUME', 'seed', 'seed'),
  ('Caja',      'caja', 'PACK',   'seed', 'seed'),
  ('Paquete',   'pqt',  'PACK',   'seed', 'seed'),
  ('Docena',    'doc',  'PACK',   'seed', 'seed')
ON CONFLICT (abbreviation) DO NOTHING;

-- ── Marcas ─────────────────────────────────────────────────────────────────

INSERT INTO brands (name, country_of_origin, created_by, updated_by) VALUES
  ('Coca-Cola',  'Estados Unidos', 'seed', 'seed'),
  ('Postobón',   'Colombia',       'seed', 'seed'),
  ('Alpina',     'Colombia',       'seed', 'seed'),
  ('Nestlé',     'Suiza',          'seed', 'seed'),
  ('Quaker',     'Estados Unidos', 'seed', 'seed'),
  ('Diana',      'Colombia',       'seed', 'seed'),
  ('Frito-Lay',  'Estados Unidos', 'seed', 'seed'),
  ('Familia',    'Colombia',       'seed', 'seed'),
  ('Colgate',    'Estados Unidos', 'seed', 'seed'),
  ('Van Camps',  'Estados Unidos', 'seed', 'seed'),
  ('Fruco',      'Colombia',       'seed', 'seed'),
  ('Alquería',   'Colombia',       'seed', 'seed'),
  ('Genérico',   'Colombia',       'seed', 'seed')
ON CONFLICT (name) DO NOTHING;

-- ── Categorías raíz ────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, sort_order, created_by, updated_by) VALUES
  ('Bebidas',                'bebidas',              1, 'seed', 'seed'),
  ('Alimentos',              'alimentos',            2, 'seed', 'seed'),
  ('Lácteos y Refrigerados', 'lacteos-refrigerados', 3, 'seed', 'seed'),
  ('Aseo y Limpieza',        'aseo-limpieza',        4, 'seed', 'seed')
ON CONFLICT (slug) DO NOTHING;

-- ── Subcategorías ──────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, sort_order, parent_id, created_by, updated_by)
SELECT d.name, d.slug, d.sort_order, c.id, 'seed', 'seed'
FROM (VALUES
  ('Gaseosas',            'gaseosas',            1, 'bebidas'),
  ('Jugos y Néctares',    'jugos-nectares',       2, 'bebidas'),
  ('Agua',                'agua',                3, 'bebidas'),
  ('Granos y Cereales',   'granos-cereales',      1, 'alimentos'),
  ('Enlatados',           'enlatados',            2, 'alimentos'),
  ('Snacks y Pasabocas',  'snacks-pasabocas',     3, 'alimentos'),
  ('Condimentos y Salsas','condimentos-salsas',   4, 'alimentos'),
  ('Panadería',           'panaderia',            5, 'alimentos'),
  ('Leches',              'leches',               1, 'lacteos-refrigerados'),
  ('Quesos y Derivados',  'quesos-derivados',     2, 'lacteos-refrigerados'),
  ('Limpieza del Hogar',  'limpieza-hogar',       1, 'aseo-limpieza'),
  ('Aseo Personal',       'aseo-personal',        2, 'aseo-limpieza')
) AS d(name, slug, sort_order, parent_slug)
JOIN categories c ON c.slug = d.parent_slug
ON CONFLICT (slug) DO NOTHING;

-- ── Productos ──────────────────────────────────────────────────────────────

INSERT INTO products (
  sku, barcode, name,
  category_id, brand_id, uom_id,
  purchase_price,
  min_stock, max_stock, reorder_point, reorder_quantity,
  is_perishable, shelf_life_days, requires_refrigeration,
  created_by, updated_by
)
SELECT
  d.sku, d.barcode, d.name,
  cat.id, brd.id, uom.id,
  d.purchase_price,
  d.min_stock, d.max_stock, d.reorder_point, d.reorder_quantity,
  d.is_perishable, d.shelf_life_days, d.requires_refrigeration,
  'seed', 'seed'
FROM (VALUES
  ('BEB-COK-250',  '7702036040231', 'Coca-Cola 250 mL',           'gaseosas',          'Coca-Cola', 'mL',  1200, 24,  144, 48,  72, FALSE, NULL, FALSE),
  ('BEB-COK-500',  '7702036040248', 'Coca-Cola 500 mL',           'gaseosas',          'Coca-Cola', 'mL',  2000, 24,   96, 36,  48, FALSE, NULL, FALSE),
  ('BEB-POST-MAN', '7702007010141', 'Postobón Manzana 400 mL',    'gaseosas',          'Postobón',  'mL',  1500, 24,  120, 36,  60, FALSE, NULL, FALSE),
  ('BEB-AGU-600',  '7702007560023', 'Agua Cristal 600 mL',        'agua',              'Postobón',  'mL',   900, 48,  240, 72, 120, FALSE, NULL, FALSE),
  ('ALI-ARR-1KG',  '7702136002015', 'Arroz Diana 1 kg',           'granos-cereales',   'Diana',     'kg',  3200, 20,  100, 30,  50, FALSE, NULL, FALSE),
  ('ALI-FRI-500G', '7702001500019', 'Fríjol Rojo 500 g',          'granos-cereales',   'Genérico',  'g',   2800, 10,   60, 15,  30, FALSE, NULL, FALSE),
  ('ALI-AZU-1KG',  '7702001000012', 'Azúcar blanca 1 kg',         'granos-cereales',   'Genérico',  'kg',  2500, 20,   80, 25,  40, FALSE, NULL, FALSE),
  ('ALI-SAL-500G', '7702001000029', 'Sal 500 g',                  'condimentos-salsas','Genérico',  'g',    800, 15,   60, 20,  30, FALSE, NULL, FALSE),
  ('ALI-SAL-FRU',  '7702006200018', 'Salsa de tomate Fruco 200 g','condimentos-salsas','Fruco',     'g',   2200, 10,   50, 15,  24, FALSE, NULL, FALSE),
  ('ALI-ATU-150G', '7702002150013', 'Atún Van Camps 150 g',       'enlatados',         'Van Camps', 'g',   3500, 12,   60, 18,  36, FALSE, NULL, FALSE),
  ('SNK-PAP-45G',  '7702116045019', 'Papas Papa Noel 45 g',       'snacks-pasabocas',  'Frito-Lay', 'g',   1800, 24,   96, 36,  48, FALSE, NULL, FALSE),
  ('PAN-TAJ-500G', '7702001500033', 'Pan tajado 500 g',           'panaderia',         'Genérico',  'g',   3800,  5,   20,  8,  10, TRUE,    5, FALSE),
  ('LAC-LEC-1L',   '7702007100018', 'Leche Alquería 1 L',         'leches',            'Alquería',  'L',   3200, 12,   60, 20,  36, TRUE,    7, TRUE),
  ('LAC-YOG-200G', '7702007200022', 'Yogurt Alpina 200 g',        'quesos-derivados',  'Alpina',    'g',   2500, 12,   48, 18,  24, TRUE,   14, TRUE),
  ('LAC-QUE-250G', '7702007300019', 'Queso Doblecrema 250 g',     'quesos-derivados',  'Alpina',    'g',   5500,  6,   24,  8,  12, TRUE,   21, TRUE),
  ('ASP-COL-75ML', '7891024003442', 'Colgate Total 75 mL',        'aseo-personal',     'Colgate',   'mL',  6500,  6,   30, 10,  12, FALSE, NULL, FALSE),
  ('LIM-DET-500G', '7702019050011', 'Detergente Ariel 500 g',     'limpieza-hogar',    'Genérico',  'g',   7200,  6,   30, 10,  12, FALSE, NULL, FALSE),
  ('LIM-PAP-HOG',  '7702019100013', 'Papel Higiénico Familia x4', 'limpieza-hogar',    'Familia',   'pqt', 5800, 10,   50, 15,  24, FALSE, NULL, FALSE)
) AS d(sku, barcode, name,
       cat_slug, brand_name, uom_abbr,
       purchase_price, min_stock, max_stock, reorder_point, reorder_quantity,
       is_perishable, shelf_life_days, requires_refrigeration)
JOIN categories       cat ON cat.slug         = d.cat_slug
JOIN brands           brd ON brd.name         = d.brand_name
JOIN units_of_measure uom ON uom.abbreviation = d.uom_abbr
ON CONFLICT (sku) DO NOTHING;

-- ── Stock inicial ──────────────────────────────────────────────────────────

INSERT INTO inventory_stock (product_id, quantity, last_movement_at, last_count_at, created_by, updated_by)
SELECT p.id, d.qty, NOW(), NOW(), 'seed', 'seed'
FROM (VALUES
  ('BEB-COK-250',   96),
  ('BEB-COK-500',   60),
  ('BEB-POST-MAN',  72),
  ('BEB-AGU-600',  144),
  ('ALI-ARR-1KG',   60),
  ('ALI-FRI-500G',  40),
  ('ALI-AZU-1KG',   50),
  ('ALI-SAL-500G',  45),
  ('ALI-SAL-FRU',   30),
  ('ALI-ATU-150G',  36),
  ('SNK-PAP-45G',   72),
  ('PAN-TAJ-500G',  12),
  ('ASP-COL-75ML',  18),
  ('LIM-DET-500G',  20),
  ('LIM-PAP-HOG',   30),
  ('LAC-LEC-1L',    30),
  ('LAC-YOG-200G',  24),
  ('LAC-QUE-250G',  15)
) AS d(sku, qty)
JOIN products p ON p.sku = d.sku
ON CONFLICT (product_id) DO NOTHING;
