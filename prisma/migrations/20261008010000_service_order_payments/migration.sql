-- Anticipos y pagos de pedidos de servicio (#37). Sólo agrega una tabla.
-- CreateTable
CREATE TABLE "ServiceOrderPayment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "kind" "PaymentKind" NOT NULL DEFAULT 'Abono',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" UUID NOT NULL,
    "receiptUrl" TEXT,

    CONSTRAINT "ServiceOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceOrderPayment_date_idx" ON "ServiceOrderPayment"("date");

-- AddForeignKey
ALTER TABLE "ServiceOrderPayment" ADD CONSTRAINT "ServiceOrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPayment" ADD CONSTRAINT "ServiceOrderPayment_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

