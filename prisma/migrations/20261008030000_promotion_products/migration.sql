-- Promociones de sólo algunos productos (#34). Las existentes quedan para todos los productos.
-- AlterTable
ALTER TABLE "SupplierPromotion" ADD COLUMN     "allProducts" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SupplierPromotionProduct" (
    "promotionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "SupplierPromotionProduct_pkey" PRIMARY KEY ("promotionId","productId")
);

-- AddForeignKey
ALTER TABLE "SupplierPromotionProduct" ADD CONSTRAINT "SupplierPromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "SupplierPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPromotionProduct" ADD CONSTRAINT "SupplierPromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

