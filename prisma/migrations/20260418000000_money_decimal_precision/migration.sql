-- Tighten all money columns to NUMERIC(10, 2) so currency values are stored
-- and returned with exactly two decimals (max ±99,999,999.99).

ALTER TABLE "Client"       ALTER COLUMN "currentBalance" SET DATA TYPE NUMERIC(10, 2);
ALTER TABLE "LayawayItem"  ALTER COLUMN "price"          SET DATA TYPE NUMERIC(10, 2);
ALTER TABLE "Payment"      ALTER COLUMN "amount"         SET DATA TYPE NUMERIC(10, 2);
ALTER TABLE "Product"      ALTER COLUMN "price"          SET DATA TYPE NUMERIC(10, 2);
ALTER TABLE "Sale"         ALTER COLUMN "total"          SET DATA TYPE NUMERIC(10, 2);
ALTER TABLE "SaleItem"     ALTER COLUMN "finalPrice"     SET DATA TYPE NUMERIC(10, 2);
