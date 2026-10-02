-- Corte por ventana: desde el cierre anterior hasta el cierre. La tabla
-- está vacía al aplicar esto, así que las columnas entran NOT NULL.
-- AlterTable
ALTER TABLE "CashClosing" ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL;

