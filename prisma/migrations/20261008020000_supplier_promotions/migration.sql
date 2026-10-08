-- Promociones por proveedor (#34). Agrega una tabla y una columna opcional en SaleItem.
-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('Porcentaje', 'CantidadFija');

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "promotionId" INTEGER;

-- CreateTable
CREATE TABLE "SupplierPromotion" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "name" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "SupplierPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPromotion_supplierId_idx" ON "SupplierPromotion"("supplierId");

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "SupplierPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPromotion" ADD CONSTRAINT "SupplierPromotion_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPromotion" ADD CONSTRAINT "SupplierPromotion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

