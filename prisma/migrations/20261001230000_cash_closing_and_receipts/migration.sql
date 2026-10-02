-- Corte de caja diario y comprobantes de pago. Sólo agrega: dos columnas
-- nullable y una tabla nueva.
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "receiptUrl" TEXT;

-- CreateTable
CREATE TABLE "CashClosing" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "openingCash" DECIMAL(10,2) NOT NULL,
    "cashSales" DECIMAL(10,2) NOT NULL,
    "cashPayments" DECIMAL(10,2) NOT NULL,
    "bankTotal" DECIMAL(10,2) NOT NULL,
    "expectedCash" DECIMAL(10,2) NOT NULL,
    "countedCash" DECIMAL(10,2) NOT NULL,
    "difference" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "closedBy" UUID NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashClosing_date_key" ON "CashClosing"("date");

-- AddForeignKey
ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

