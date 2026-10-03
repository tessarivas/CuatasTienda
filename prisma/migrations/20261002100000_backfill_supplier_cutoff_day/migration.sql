-- Sólo datos (sin cambios de esquema): los proveedores sin día de corte toman
-- el día del mes en que se dieron de alta, en hora de la tienda (Pacífico).
-- Los que ya tienen día (puesto a mano) se respetan.
UPDATE "Supplier"
SET "cutoffDay" = EXTRACT(DAY FROM ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tijuana'))::int
WHERE "cutoffDay" IS NULL;
