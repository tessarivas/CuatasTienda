-- Cambiamos el modelo: "Apartado" deja de ser un estado almacenado en
-- Product.status. Las reservas se derivan del conteo de LayawayItem
-- activos. Limpiamos filas existentes que quedaron con status "Apartado".

UPDATE "Product" SET status = 'Disponible' WHERE status = 'Apartado';
