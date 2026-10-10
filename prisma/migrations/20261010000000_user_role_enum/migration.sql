-- User.role pasa de texto libre a enum: en el Table Editor de Supabase se
-- elige de una lista (ADMIN / USER) y la base rechaza cualquier otro valor.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- Los valores existentes se normalizan (mayúsculas, sin espacios) antes de
-- convertirlos; cualquier otro valor queda como USER.
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (CASE WHEN upper(trim("role")) = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END)::"UserRole";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
