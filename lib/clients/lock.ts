import type { Prisma } from "@/generated/prisma/client";

// Bloquea la fila del cliente (SELECT … FOR UPDATE) hasta que termine la
// transacción. Se usa en las operaciones que leen el saldo y luego lo cambian
// (devolver excedente, liquidar apartados): sin el candado, dos peticiones al
// mismo tiempo leen el mismo saldo y ambas pasan la validación. Con él, la
// segunda espera a que la primera termine y lee el saldo ya actualizado.
export async function lockClient(tx: Prisma.TransactionClient, clientId: number) {
  await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${clientId} FOR UPDATE`;
}
