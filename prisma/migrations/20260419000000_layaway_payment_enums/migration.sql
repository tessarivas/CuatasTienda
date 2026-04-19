-- Introducimos los enums formales para Layaway.status y Payment.method,
-- alineados con la convención title-case que ya usamos en Product.status.

CREATE TYPE "LayawayStatus" AS ENUM ('Activo', 'Liquidado', 'Cancelado');
CREATE TYPE "PaymentMethod" AS ENUM ('Efectivo', 'Tarjeta', 'Transferencia');

-- Layaway.status: String -> LayawayStatus. El USING hace el cast implícito.
-- Si existieran filas con valores fuera del enum el ALTER fallaría; la tabla
-- está vacía hoy así que es seguro.
ALTER TABLE "Layaway"
  ALTER COLUMN "status" TYPE "LayawayStatus" USING ("status"::"LayawayStatus"),
  ALTER COLUMN "status" SET DEFAULT 'Activo';

-- Payment.method: columna nueva, default Efectivo. No hay filas hoy.
ALTER TABLE "Payment"
  ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'Efectivo';
