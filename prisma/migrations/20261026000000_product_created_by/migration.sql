-- Quién dio de alta cada producto (para el "Alta inicial" del historial del
-- negocio). Null en los productos que ya existían.
ALTER TABLE "Product" ADD COLUMN     "createdBy" UUID;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
