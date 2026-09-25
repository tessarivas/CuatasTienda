-- AlterTable
ALTER TABLE "LayawayItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "saleId" INTEGER,
ADD COLUMN     "status" "LayawayStatus" NOT NULL DEFAULT 'Activo';

-- CreateIndex
CREATE INDEX "LayawayItem_productId_status_idx" ON "LayawayItem"("productId", "status");

-- AddForeignKey
ALTER TABLE "LayawayItem" ADD CONSTRAINT "LayawayItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: los items existentes no tienen fecha propia. La mejor
-- aproximación es cuándo se abrió su apartado (Layaway.createdAt); si no,
-- quedarían todos con la fecha de esta migración.
UPDATE "LayawayItem" li
SET "createdAt" = l."createdAt"
FROM "Layaway" l
WHERE li."layawayId" = l."id";

-- Hasta ahora los items liquidados o liberados se BORRABAN, así que todo item
-- existente sigue vigente salvo que su apartado ya no esté Activo; en ese caso
-- hereda el status del apartado para no contarlo como reserva.
UPDATE "LayawayItem" li
SET "status" = l."status"
FROM "Layaway" l
WHERE li."layawayId" = l."id" AND l."status" <> 'Activo';
