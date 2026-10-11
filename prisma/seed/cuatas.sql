-- Datos iniciales: la tienda misma (Cuatas) como proveedor #1, con sus
-- productos y servicios de siempre. Se corre UNA vez después de reiniciar la
-- base (`npx prisma migrate reset`), desde el SQL Editor de Supabase o con
-- psql. Es idempotente: correrlo de nuevo no duplica nada.
--
-- Las fotos y el logo ya están en Cloudinary con el esquema actual
-- (products/{code} en la carpeta products/Cuatas; logo en suppliers/1), por
-- eso el proveedor va con id 1 fijo y los productos con su código de
-- siempre: así las URLs coinciden.
--
-- Las cantidades iniciales no generan StockMovement: el historial del
-- proveedor las muestra como "Alta inicial" (se reconstruye desde createdAt).

BEGIN;

INSERT INTO "Supplier" (id, name, "businessName", cellphone, email, logo, "cutoffDay", "servicePrefix")
VALUES (
  1,
  'Andrea y Teresa Rivas',
  'Cuatas',
  '6161599954',
  'cuatas.tienda@gmail.com',
  'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677117/suppliers/1.webp',
  15,
  'CU'
)
ON CONFLICT (id) DO NOTHING;

-- El id 1 se insertó a mano: la secuencia tiene que seguir desde ahí para que
-- el siguiente proveedor dado de alta en la app no choque.
SELECT setval(pg_get_serial_sequence('"Supplier"', 'id'), (SELECT max(id) FROM "Supplier"));

INSERT INTO "Product" (code, title, price, status, type, quantity, picture, "supplierId")
VALUES
  -- Productos
  ('CU-9NJXR6P2', 'Folder Oxford',  5.00, 'Disponible', 'PRODUCT', 87,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677112/products/CU-9NJXR6P2.webp', 1),
  ('CU-KKS629X7', 'Lapiz #2',       5.00, 'Disponible', 'PRODUCT', 98,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677112/products/CU-KKS629X7.webp', 1),
  ('CU-UXG7D3PT', 'Pluma Azul Bic', 5.00, 'Disponible', 'PRODUCT', 38,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677113/products/CU-UXG7D3PT.webp', 1),
  -- Servicios (sin inventario: quantity NULL)
  ('CU-JFBWJSKN', 'Acta de Nacimiento $150', 150.00, 'Disponible', 'SERVICE', NULL,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677114/products/CU-JFBWJSKN.webp', 1),
  ('CU-SJ3MKCC6', 'Acta de Nacimiento $200', 200.00, 'Disponible', 'SERVICE', NULL,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677115/products/CU-SJ3MKCC6.webp', 1),
  ('CU-EQUX74EU', 'Copia Color',             5.00, 'Disponible', 'SERVICE', NULL,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677116/products/CU-EQUX74EU.webp', 1),
  ('CU-X6JG8KCT', 'Copias Blanco y Negro',   2.00, 'Disponible', 'SERVICE', NULL,
   'https://res.cloudinary.com/dlr5y2vmz/image/upload/v1791677117/products/CU-X6JG8KCT.webp', 1)
ON CONFLICT (code) DO NOTHING;

COMMIT;
