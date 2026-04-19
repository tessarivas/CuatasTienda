import type { Client } from "@/lib/data";

// Shape returned by Prisma routes: numeric id, nullable cellphone,
// Decimal(10,2) currentBalance serialized as string.
export type ApiClient = {
  id: number;
  name: string;
  cellphone: string | null;
  currentBalance: string | number;
};

// La UI heredó la forma mock (id:string, phone:string, balance:number).
// Adaptamos aquí para no tocar componentes por el rename de columnas.
export function normalizeClient(c: ApiClient): Client {
  return {
    id: String(c.id),
    name: c.name,
    phone: c.cellphone ?? "",
    balance: Number(c.currentBalance),
  };
}

export function normalizeClients(list: ApiClient[]): Client[] {
  return list.map(normalizeClient);
}
