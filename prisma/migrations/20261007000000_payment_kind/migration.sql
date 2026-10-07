-- Devolución de saldo a favor (#36): un Payment puede ser un abono (el de
-- siempre, por defecto) o una devolución al cliente.
-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('Abono', 'Devolucion');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "kind" "PaymentKind" NOT NULL DEFAULT 'Abono';
