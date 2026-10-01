-- Ventas de caja persistidas: folio legible, método de pago, cantidad y
-- descuentos. Sólo agrega columnas (todas con default o nullable), así que
-- el código anterior sigue funcionando mientras se despliega el nuevo.

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "folio" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- Backfill: folio DDMMYY-NNN para ventas que ya existían, con la fecha en
-- hora de México y el consecutivo del día en orden de id.
UPDATE "Sale" s
SET "folio" = f.folio
FROM (
  SELECT id,
         to_char(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DDMMYY')
           || '-' ||
         lpad(row_number() OVER (
           PARTITION BY (date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date
           ORDER BY id
         )::text, 3, '0') AS folio
  FROM "Sale"
) f
WHERE s.id = f.id;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_folio_key" ON "Sale"("folio");
