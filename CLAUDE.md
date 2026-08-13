# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spanish-language (es-MX) retail back-office for a small consignment store: suppliers, inventory,
clients with credit balances, layaways ("apartados"), and a POS screen.

## Commands

```bash
npm run dev            # Next.js dev server (localhost:3000)
npm run build          # production build
npm run lint           # eslint (flat config)
npx tsc --noEmit       # typecheck — there is NO npm script for this
```

`package.json` has a bug: `"type": "module"` is nested inside `"scripts"` instead of being a
top-level field. It does nothing, and there is no `npm run type`. Use `npx tsc --noEmit`.

### Database (Prisma 7 — no npm scripts wrap these)

```bash
npx prisma generate                    # REQUIRED after clone and after any schema.prisma edit
npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma migrate deploy              # apply pending migrations
npx prisma studio
```

Output goes to `generated/prisma/`, which is **gitignored**. A fresh clone will not typecheck
until you run `prisma generate`. Nothing automates it — there is no `postinstall` hook.

Import the client from `@/generated/prisma/client`, **not** `@prisma/client`
(`types/global.d.ts` still references the old path and is stale).

### Testing

There is no test framework, no test files, and no test script. Do not invent one unless asked.
Verification is `npm run lint` + `npx tsc --noEmit` + manually exercising the dev server.

## Environment

Config lives in a gitignored `.env` (there is no `.env.example`):

`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_URL`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Two database URLs, used by different consumers — do not conflate them:
- `DATABASE_URL` — runtime Prisma client (`lib/db/client.ts`, via the `pg` driver adapter)
- `DIRECT_URL` — Prisma CLI / migrations only (`prisma.config.ts`)

## Stack

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (new-york, stone)
· Prisma 7 + driver adapter over Postgres (Supabase) · Supabase Auth · Cloudinary · npm.

Tailwind v4 has **no config file** — theme tokens are declared in CSS in `app/globals.css`
(`@import 'tailwindcss'`, `@custom-variant dark`, oklch vars, plus brand tokens `--my-blue` /
`--my-yellow` / `--my-red`). Do not create a `tailwind.config.*`.

Path alias: `@/*` → repo root.

## Architecture

### Auth — and the gap in it

Supabase Auth (`@supabase/ssr`), cookie-based. No NextAuth, no custom JWT.

- `middleware.ts` redirects unauthenticated requests for `/admin/*` (except `/admin/login`) to the
  login page. It has **no `export const config = { matcher }`**, and it only acts on paths starting
  with `/admin`.
- **`/api/*` is therefore NOT protected by middleware.** Only 5 route files authenticate at all:
  `api/auth`, `api/me`, `api/sync-user`, `api/clients/[id]/payments`, and
  `api/clients/[id]/layaway/liquidate`. All supplier, product, client, and layaway-item CRUD
  endpoints are effectively open. When adding or touching a route that reads or mutates data,
  add an explicit `supabaseServerClient()` + `getUser()` check → `401 { error: "No autenticado" }`.
  Do not assume the middleware covers you.
- `User.role` exists and is written as the literal `"USER"` by `sync-user`, but **no code reads or
  enforces it**. There is no role-based authorization yet.
- The only authorization that does exist is ownership checking (a layaway item's `Layaway.clientId`
  must match the route's client → `403`), and taking `receivedBy` / `userId` from the session
  rather than the request body.

**Identity bridge:** the Prisma `User.id` is a `@db.Uuid` that *is* the Supabase auth user id.
`app/api/sync-user/route.ts` upserts the Supabase user into the `User` table after login; on
update it syncs `email` only and deliberately never touches `name`, which is owned by
`PATCH /api/me` once the row exists.

Server-side session access: `supabaseServerClient()` in `lib/supabase/server.ts`. There is also a
`getCurrentUser()` wrapper in `modules/auth/auth.service.ts`, but nothing uses it — the `modules/`
directory is an intended service layer that was never adopted; route handlers call Prisma directly.

### API route conventions

Hand-written REST in `app/api/`, copy-pasted rather than factored into shared helpers. Match the
surrounding style. Reference: `app/api/suppliers/[id]/route.ts`.

- Dynamic params are a Promise in Next 16: `type Ctx = { params: Promise<{ id: string }> }`, then
  `const { id } = await params`. This type is redeclared in every dynamic route.
- A local `parseId` helper is duplicated in ~9 files; returns `null` for non-positive-integer ids
  → `400 { error: "ID inválido" }`.
- **Validation is manual**: `try { await req.json() } catch { 400 "JSON inválido" }`, then
  `body as { field?: unknown }` and per-field `typeof` narrowing. `zod` is a dependency with
  **zero imports** — do not introduce it ad hoc into one route.
- **PATCH semantics:** build a typed `Prisma.XUpdateInput`; `undefined` = leave untouched,
  `null`/`""` = clear to `null`. Strings are always `.trim()`ed. An empty resulting `data` object
  returns `400 "No hay cambios para aplicar"`.
- **Responses** are always `NextResponse.json(...)`. Errors are `{ error: string }` in **Spanish**,
  sometimes with context keys (`productCount`, `reservedCount`, `details`). Success returns the bare
  Prisma entity, an array, `{ success: true }`, or an object for multi-entity mutations
  (`{ payment, client }`, `{ sale, client, layaway }`).
- **Status codes:** `400` invalid input · `401` `"No autenticado"` · `403` cross-client ownership ·
  `404` missing (also from Prisma `P2025`) · `409` **business-rule conflict** (the most distinctive
  one: supplier still has active products, client has non-zero balance, product has active
  reservations, insufficient balance) · `201` creates · `500` after
  `console.error("<VERB> <entidad> falló", err)`.
- **Prisma error mapping** is inline per handler: `P2025` → 404, `P2002` → unique-code collision
  retry, `P2003` → 409 "usuario aún no está sincronizado".
- **Money** is validated with a duplicated `const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/`, capped at
  `100_000_000`, and stored via `Number(x).toFixed(2)` into `Decimal(10,2)`.
- **Multi-step mutations** use `prisma.$transaction(async (tx) => ...)` and return a *discriminated
  result object* — `{ error: "..." as const, status: 4xx }` — instead of throwing; the outer handler
  translates that into the response. See `app/api/clients/[id]/layaway/liquidate/route.ts`.
- **`_count` is flattened before returning** — e.g. `_count.LayawayItem` (filtered to
  `Layaway.status = "Activo"`) becomes a flat `reservedCount`, so the UI never sees `_count`.
- Comments in route files are Spanish and unusually explanatory about *why* a rule exists. Preserve
  that when editing.

### Domain model and its invariants (`prisma/schema.prisma`)

```
Supplier 1──n Product                    (consignment; cutoffDay 1–31 = monthly settlement day)
Client   1──n Layaway 1──n LayawayItem n──1 Product
Client   1──n Payment n──1 User          (receivedBy = cashier)
Client   1──n Sale    1──n SaleItem  n──1 Product
```

Enum values are **Spanish**: `LayawayStatus (Activo | Liquidado | Cancelado)`,
`PaymentMethod (Efectivo | Tarjeta | Transferencia)`. `ProductType` is English (`PRODUCT | SERVICE`).

Rules enforced in route handlers, **not** in the schema — preserve them:

- **Reservations are derived from row counts** (`LayawayItem` whose `Layaway.status = "Activo"`),
  never from `Product.status`. Availability = `quantity - reservedCount`.
- `Product.status` is a plain `String` (`"Disponible" | "Vendido" | "Retirado"`), never settable via
  API: `POST` forces `"Disponible"`, `PATCH` rejects a `status` key outright, `DELETE` is a **soft
  delete** to `"Retirado"`, and `POST /api/products/[id]/restore` is the only way back. Retired
  products are excluded from listings and don't block supplier deletion.
- `price`, `quantity`, and `supplierId` are **frozen while reservations exist**
  (`RESERVED_BLOCKED_FIELDS` in `app/api/products/[id]/route.ts` → 409).
- **Services carry no inventory** — `quantity` is null in the DB and `normalizeProduct` returns `0`,
  so consumers must branch on `type === "SERVICE"` rather than trusting `quantity`.
- `LayawayItem.price` and `SaleItem.finalPrice` are **price snapshots** taken at reservation time,
  not the product's current price.
- `Client.currentBalance` is prepaid credit: incremented by `Payment` ("abono"), decremented on
  liquidation. Deleting a client requires zero balance and zero reserved items.
- Product `code` is unique (`CT-XXXXXXXX`); creation retries on `P2002` with a new code.

All money is `Decimal @db.Decimal(10, 2)` and serializes to a **string** over JSON — always
`Number(...)` it at the boundary (the normalize helpers already do).

**Glossary:** apartado = layaway · abono = deposit into client credit · liquidar = settle a layaway
against that credit · proveedor = supplier · saldo = balance · corte = billing cutoff.

### The mock-data legacy shape and the normalize boundary

`lib/data.ts` holds the app's shared UI type vocabulary *and* leftover mock seed arrays
(`initialProducts`, `initialClients`, `initialSuppliers`, `initialSales`, `initialTransactions`),
still imported as context defaults. Components are written against these legacy shapes, which
differ from the DB: string ids vs numeric, `photoUrl` vs the DB column `picture`, `barcode` vs
`code`, `phone` vs `cellphone`, `balance` vs `currentBalance`, numeric price vs `Decimal`-string.

`lib/products/normalize.ts` and `lib/clients/normalize.ts` are the seam that bridges them.
**Call these on API responses instead of teaching components DB column names.** This is a migration
in progress; `lib/data.ts` also contains stale fields that no longer match its own types.

### Client-heavy rendering

`app/layout.tsx` is marked `"use client"`, so effectively the whole tree renders client-side despite
`components.json` declaring `rsc: true`. There are **no server actions**, and no `loading.tsx` /
`error.tsx` / `not-found.tsx`.

`app/(admin)/admin/dashboard/layout.tsx` is the de-facto app root: it owns the global store
(clients, products, suppliers, sales, transactions, `searchTerm`, `reloadSuppliers`), fetches
`/api/clients`, `/api/products?include=all` and `/api/suppliers` in `useEffect`s, and renders the
sidebar shell.

Data fetching is plain `fetch("/api/...")` in `useEffect` + `useState`. Mutations are followed by
manual `reload*()` calls or local `setState` patching, so cache coherence is hand-managed.
`@tanstack/react-query` is installed and `providers.tsx` defines a `QueryClientProvider`, but
**that provider is never mounted and React Query has zero usages.** Don't assume it's wired up.

### Two different `DashboardContext` exports — a real trap

- `app/layout.tsx` exports a `DashboardContext` seeded from mock data (products, transactions only).
- `app/(admin)/admin/dashboard/layout.tsx` exports a *different, larger* one — this is the live
  context, imported by relative path (`../layout`, `../../layout`).

Check which one a file already imports before adding a consumer.

### POS is not persisted

There is **no `/api/sales` route**. The POS page keeps carts, discounts, and completed sales in
`DashboardContext` in memory only. `Sale` rows are created solely by the layaway `liquidate`
endpoint. Don't assume checkout writes to the database.

### Images

Cloudinary, with **deterministic overwrite-in-place public ids** so re-uploading replaces the asset
instead of accumulating copies: `products/{code}/picture` (`lib/cloudinary/product.ts`) and
`suppliers/{id}-{slug}/logo` (`lib/cloudinary/supplier.ts`, with an accent-stripping
`sanitizeFolderName`). Uploads arrive as `multipart/form-data` via `POST` to the entity route
(e.g. `POST /api/suppliers/[id]` with a `file` field), which writes `secure_url` to the DB. Product
creation uploads *before* insert and cleans up orphans on code collision.
`next.config.ts` allowlists `res.cloudinary.com` for `next/image`.

## Conventions

- **Spanish-first**: UI copy, API error messages, commit messages, and most comments are Spanish.
  Identifiers and Prisma model/field names are English (except the Spanish enum values). Write
  user-facing strings and API errors in Spanish; keep new identifiers English.
- Prisma relation fields are PascalCase and singular (`Product`, `LayawayItem`), so they appear
  capitalized in JSON payloads.
- Route-local components live in `_components/` beside the page; modals dominate
  (`add-*-modal`, `edit-*-modal`, `*-details-modal`, `delete-*-dialog`). Files are kebab-case.
- shadcn/ui primitives in `components/ui/` are generated — prefer `npx shadcn@latest add <x>` over
  hand-writing them, and avoid editing them directly.
- `next.config.ts` sets `serverExternalPackages: ["@prisma/client"]`; keep Prisma out of client
  components.
- `lib/db/client.ts` instantiates `PrismaClient` at module scope with **no global singleton guard**,
  so dev HMR can leak connections. If you touch that file, consider the standard `globalThis` guard.

## Known-broken / dead code (do not copy or import)

- `hooks/use-auth.ts` — imports the **server** Supabase client into a client hook and calls
  `.auth.getUser()` on the class rather than an instance. Cannot work.
- `context/username-context.ts` — `UsernameProvider` returns the literal `0` instead of JSX.
- `providers.tsx` — never mounted.
- `modules/auth/auth.service.ts` — unused.
- `types/global.d.ts` — stale `global.prisma` declaration pointing at `@prisma/client`.

## Highest-signal files to read first

- `prisma/schema.prisma` — the domain
- `app/api/clients/[id]/layaway/liquidate/route.ts` — the core business transaction, fully commented
- `app/api/products/[id]/route.ts` — reservation and soft-delete invariants
- `app/(admin)/admin/dashboard/layout.tsx` — the client-side app shell and global store
- `middleware.ts` + `lib/supabase/server.ts` — the entire auth surface
