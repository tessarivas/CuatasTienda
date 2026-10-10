# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spanish-language (es-MX) retail back-office for a small consignment store: suppliers, inventory,
clients with credit balances, layaways ("apartados"), and a POS screen.

Check `TODO.md` for agreed-but-not-built work. Finished items are marked `- [x]` and moved to
its dated **Completado** section at the bottom (don't just delete them). Currently open: exporting/printing barcode labels (the label itself already renders:
`dashboard/_components/product-label.tsx`, Code 128 via `jsbarcode`, shown in the product detail
modal with the barcode, code, supplier and price); and a store-expenses module
(gastos) that feeds the cash closing.

The list pages `suppliers/page.tsx` and `clients/page.tsx` share one layout: title left, search +
primary CTA right on the same row, then a 3-card highlights row, then a `grid-cols-2
md:grid-cols-4` card grid. Keep new list pages consistent with it.

**Highlight cards always use `dashboard/_components/stat-card.tsx` (`StatCard`)** — icon + title,
main value, small hint below — never a hand-built colored div. Their row uses the `STAT_ROW` class from the
same file: a one-row swipe carousel on mobile, the 3-column grid from `md:`. Used on suppliers, clients, sales
history and cash closing. Colors by position: yellow → blue → green on suppliers/clients;
yellow → blue → pink on sales and cash closing (green/purple/orange for the sales money row). Hints
are short plain sentences (no em dashes).

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

After `migrate deploy` + `generate`, **restart `npm run dev`**: the running server keeps the old
client in memory and rejects queries that use the new fields (500s) until restarted; touching
`lib/db/client.ts` does not reload it.

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
(`@import 'tailwindcss'`, `@custom-variant dark`, oklch vars, plus 7 brand tokens: `--my-blue`,
`--my-yellow`, `--my-red`, `--my-green`, `--my-orange`, `--my-purple`, `--my-pink`). Do not create a
`tailwind.config.*`.

Each brand color has three shades — base, `-light`, `-dark` — chosen to share OKLCH chroma
(~0.17–0.20) so they read as one family. **Status tags use `bg-{color}-light` + `text-{color}-dark`**
(e.g. `bg-my-green-light text-my-green-dark` for "Disponible"); small unlabeled dots (status badges
on thumbnails) use the **base** tone alone, since at that size the light/dark pair doesn't read.
Don't reach for raw Tailwind colors (`bg-green-500`, `text-rose-600`, …) in this app — use these
tokens.

Path alias: `@/*` → repo root.

## Architecture

### Auth

Supabase Auth (`@supabase/ssr`), cookie-based. No NextAuth, no custom JWT.

**`middleware.ts` is the single gate.** Its matcher is `["/admin/:path*", "/api/:path*"]`, it
validates the session with `getUser()` (not `getSession()`, which doesn't revalidate the token),
and it branches by route type:

- `/api/*` unauthenticated → `401 { error: "No autenticado" }` as JSON. Never a redirect — a 302
  to HTML breaks `fetch` callers.
- `/admin/*` unauthenticated → redirect to `/admin/login`.

Because the gate is central, **individual route handlers do not repeat the check**. Do not add a
`getUser()` call to a new route just to authenticate it; the middleware already covers it. Call
`requireUser()` only when you need the user *object* (see below).

Public exceptions, all in `isPublicPath()` in `middleware.ts`:

| Path | Why |
|---|---|
| `/admin/login` | avoids a redirect loop |
| `/api/auth` | the login primitive — gating it would deadlock. GET (probe) and DELETE (logout) also pass; the handlers self-check, and 401-ing logout would strand stale cookies. |
| `GET /api/products` (exact path) | public catalogue. `POST /api/products` and all of `/api/products/[id]` stay protected. |

`GET /api/products` serves three shapes: anonymous gets a trimmed projection (`id`, `title`,
`price`, `picture`, `type`) of available stock; anonymous with `?include=all` gets 401; an
authenticated caller gets the full admin payload unchanged. Keep internal fields (`supplierId`,
`soldCount`, `code`, `quantity`, `reservedCount`) out of the anonymous branch.

**There is no account signup by API.** `PUT /api/auth` was removed — it was public and unthrottled,
so anyone could self-register into the panel. New users are created from the Supabase dashboard.

`lib/auth/require-user.ts` is the shared helper for handlers that need identity:

```ts
const { user, response } = await requireUser();
if (response) return response;   // 401 already built
```

It also exports `isUnsyncedUserError(err)` (Prisma `P2003`) and `unsyncedUserResponse()` — the
`409 "Tu usuario aún no está sincronizado"` contract. Used by `api/me`, `api/sync-user`,
`clients/[id]/payments`, and `clients/[id]/layaway/liquidate`. Those last two derive
`receivedBy` / `userId` from the session and never from the body — preserve that.

`User.role` exists and is written as the literal `"USER"` by `sync-user`, but **no code reads or
enforces it**. There is no role-based authorization: any authenticated user can do anything. The
only object-level check is a layaway item's `Layaway.clientId` matching the route's client → `403`.

This is a **deliberate deferral, not an oversight** — role-gating is planned for a later version.
Authenticated-only is the intended contract for now, so don't report it as a defect or add role
checks unprompted. When it does land, the natural first candidates are the destructive verbs
(`DELETE` on suppliers and clients, `POST /api/products/[id]/restore`), and it needs a prior manual
step: promoting a real user to `ADMIN` in the DB, since `sync-user` only ever writes `"USER"`.

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
Product  1──n StockMovement n──1 User    (createdBy; Alta/Retiro, not a sale)
```

Enum values are **Spanish**: `LayawayStatus (Activo | Liquidado | Cancelado)`,
`PaymentMethod (Efectivo | Tarjeta | Transferencia)`. `ProductType` is English (`PRODUCT | SERVICE`).

Rules enforced in route handlers, **not** in the schema — preserve them:

- **Reservations are derived from row counts** (`LayawayItem` with `status = "Activo"` whose
  `Layaway.status = "Activo"`), never from `Product.status`. Availability = `quantity - reservedCount`.
  **`LayawayItem` rows are never deleted** (since migration `layaway_item_history`): liquidating sets
  `status = "Liquidado"` + `resolvedAt` + `saleId`, removing an apartado sets `status = "Cancelado"`.
  They're the "+ apartado" lines of the client's history. **Every reservation count or listing must
  filter `status: "Activo"`** — forgetting it counts sold/cancelled items and breaks availability.
  A `Sale` with no linked `LayawayItem` predates this change (its items were deleted); the movements
  endpoint flags it `legacy: true`.
- `Product.status` is a plain `String` (`"Disponible" | "Vendido" | "Retirado"`), never settable via
  API: `POST` forces `"Disponible"`, `PATCH` rejects a `status` key outright, `DELETE` is a **soft
  delete** to `"Retirado"`, and `POST /api/products/[id]/restore` is the only way back. Retired
  products are excluded from listings and don't block supplier deletion.
- `price`, `quantity`, and `supplierId` are **frozen while reservations exist** via `PATCH`
  (`RESERVED_BLOCKED_FIELDS` in `app/api/products/[id]/route.ts` → 409). `quantity` has a second,
  looser path: `POST /api/products/[id]/stock` (see below) *does* allow increasing it with active
  reservations — growing stock never invalidates a reservation — but still blocks bringing it below
  the reserved count.
- Every non-sale stock change (receiving inventory, writing off damaged/returned stock) goes through
  `StockMovement` + `POST /api/products/[id]/stock`, never a direct `PATCH` of `quantity`. See
  "Inventory movements" below.
- **Services carry no inventory** — `quantity` is null in the DB and `normalizeProduct` returns `0`,
  so consumers must branch on `type === "SERVICE"` rather than trusting `quantity`.
- `LayawayItem.price` and `SaleItem.finalPrice` are **price snapshots** taken at reservation time,
  not the product's current price.
- `Client.currentBalance` is prepaid credit: incremented by `Payment` ("abono"), decremented on
  liquidation and by a **refund** — a `Payment` with `kind = "Devolucion"` (positive amount, the
  sign comes from `kind`; migration `payment_kind`). `POST /api/clients/[id]/refund` only allows
  refunding the surplus (balance − active apartados). **Every `Payment` sum must branch on `kind`**:
  the cash closing subtracts refunds (cash → caja de apartados, otherwise banco), and receipt
  counts/lists only consider `kind: "Abono"` (refunds never carry a comprobante). Deleting a client requires **no history at all** (no `Payment`, `Layaway` or `Sale`
  rows) — its sales feed suppliers' monthly cutoffs, so clients with history are never deleted (409).
- `POST /api/clients/[id]/layaway/liquidate` accepts an optional `payShortfall: { method }` (used by
  "Liquidar Cuenta"): if the balance doesn't cover the items, it creates a `Payment` for exactly the
  shortfall — computed server-side, never taken from the body — inside the same transaction before
  liquidating. Stock is decremented **per product by unit count**, since several items can share a
  product.
- Product `code` is unique: **supplier letters + 8 random chars** (`CU-PAV6ANCG`), the same letters as
  the supplier's service-order folios (`servicePrefixFor`). Creation retries on `P2002` with a new
  code. Codes never change afterwards (they may be printed on labels), even if the supplier's letters
  change or the product moves supplier. Until 2026-10-08 all codes were `CT-…`; they were rewritten
  once (keeping the random part).

All money is `Decimal @db.Decimal(10, 2)` and serializes to a **string** over JSON — always
`Number(...)` it at the boundary (the normalize helpers already do).

**Glossary:** apartado = layaway · abono = deposit into client credit · liquidar = settle a layaway
against that credit · proveedor = supplier · saldo = balance · corte = billing cutoff.

### Inventory movements (`StockMovement`)

A bitácora for stock changes that are **not** sales: receiving new inventory ("Alta") and writing
stock off — damage, return-to-supplier, shrinkage ("Retiro"). `Product.quantity` only ever holds
the current balance, so without this table the history is unrecoverable.

`POST /api/products/[id]/stock` — `{ type: "Alta" | "Retiro", quantity: number, reason?: string,
pickedUpBy?: string }` — is a dedicated endpoint, not a `PATCH` of `quantity`, for three reasons
(spelled out in the file): it's a **delta** so two concurrent altas add instead of clobbering each
other; adjusting the balance and writing the bitácora row have to be **atomic**; and it needs its
own rule for reservations (see above) instead of the blanket `PATCH` freeze. `pickedUpBy` (who
physically picked up the withdrawn goods, e.g. a courier) only makes sense for `Retiro` — the API
silently drops it if sent on an `Alta` rather than rejecting the request.

`GET /api/products/[id]/stock` returns one product's movements, newest first, `User` included.

**Per-supplier history** (`supplier-movements.tsx`, below Corte Mensual + Productos in
`suppliers/[id]`): `GET /api/suppliers/[id]/movements` merges `StockMovement` altas/retiros with
`SaleItem` sales of all the supplier's products, newest first; filters are client-side. It does
**not** filter by `Product.status` — retired products must stay in the record. Creating a product
writes no `StockMovement` for its initial pieces, so each product gets a reconstructed
"Alta inicial" row at `createdAt` (current quantity + sold + retirados − altas).

UI: `stock-movement-modal.tsx`, one component for both directions, opened from "Agregar unidades" /
"Retirar mercancía" in `product-details-modal.tsx`. Those buttons — and the quantity field itself —
only show once you're editing, only for `type !== "SERVICE"`, and quantity is **never** directly
editable; it only moves through this endpoint. Don't add a quantity `<Input>` back into that modal.

**Permanent delete** (`/api/products/[id]/permanent`, GET = eligibility, DELETE = delete + drop
the Cloudinary photo): only for products with **no history at all** (no `SaleItem`, `LayawayItem`
of any status, or `StockMovement`) — i.e. created by mistake. It lives inside the same "Eliminar
producto" dialog, below the soft delete, and requires typing the product name.

Naming trap: the modal's destructive button reads **"Eliminar producto"**, not "Retirar" — it does
a full soft-delete (`status → "Retirado"`, see above), a different action from "Retirar mercancía"
(`StockMovementType.Retiro`, just decrements quantity). Two different Spanish verbs for two
unrelated actions was confusing; keep them distinct in any new copy.

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
`components.json` declaring `rsc: true`. There are **no server actions** and no `loading.tsx` /
`error.tsx`. `app/not-found.tsx` is the one 404 for the whole app; it renders in the root layout
(no sidebar), so it carries its own logo and a link back to `/admin/dashboard`.

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

### Sales (POS + liquidations)

`POST /api/sales` persists a POS checkout (migration `sale_folio_and_pos`): it re-reads prices from
the DB (never trusts the client's), checks free units (`quantity − active reservations`), applies
per-item discounts, and creates `Sale` + `SaleItem` + stock decrement in one transaction (a guarded
`updateMany ... quantity >= n` rolls the sale back if stock changed mid-sale). Services carry no
stock. The cart/discount UI still lives in `DashboardContext`, but checkout writes to the DB.

- **Folio** `DDMMYY-NNN` (`lib/sales/folio.ts`): date in `America/Tijuana` (store is in Baja California, Pacific time) + per-day sequence,
  **shared by POS sales and layaway liquidations**. Unique index on `Sale.folio`; callers retry the
  whole transaction on a folio `P2002` (`isFolioCollision`, `FOLIO_RETRIES`).
- **Totals:** `SaleItem.finalPrice` is the unit price snapshot; line = `finalPrice × quantity −
  SaleItem.discount`; `Sale.total` = Σ lines − `Sale.discount`.
- **Ticket-level discount (`Sale.discount`) is only allowed when every item belongs to one supplier**
  — the store doesn't split discounts across consignment suppliers. Enforced in the cart UI (button
  disabled + tooltip) and in `POST /api/sales` (400). So the whole ticket discount is charged to that
  one supplier, which is how `GET /api/suppliers/sales` attributes it.
- `Sale.paymentMethod` is null for liquidations (paid from the client's credit).
- The POS product grid opens sorted by **"Más vendidos"** (`Product.soldCount`, all time — bumped
  by POS sales, layaway liquidations and service orders), all suppliers, **only products** (services
  one click away in the type filter).
- Below `lg:` the POS cart is a **bottom sheet**: the same `Cart` with a `sheet` prop, collapsed to
  the header (count + total + chevron) and the Cobrar button, expanding to 85% of the height. At
  `lg:` and up it's the usual right-hand 30% column. Both render from `renderCart()` in
  `pos/page.tsx`; the sheet collapses after a completed sale.
- `GET /api/sales?from&to` lists a period's sales (POS + liquidations) for the "Historial de Ventas"
  page (`dashboard/sales/`); method/origin/search filters are client-side so the highlight cards
  always summarize the whole period.

### Service orders ("Pedidos de servicio")

Two ways to sell a service: **quick ones** (copies) go through the POS like any product; **by-order
ones** (installs, maintenance) use a *pedido de servicio* (`ServiceOrder` + `ServiceOrderItem`,
migration `service_orders`, page `dashboard/service-orders/`, routes `/api/service-orders/*`). A
pedido has the customer's name/phone and one supplier's services, each with its own description,
quantity and price for this job. It starts **"Por entregar"** (`PorEntregar`).

**Money** (migration `service_order_payments`): every anticipo/pago is a `ServiceOrderPayment`
(`kind` Abono; refunds `Devolucion`) and counts in the cash closing **the day it's received** —
cash into the **main drawer** (like a sale), card/transfer into banco with a comprobante
(`POST /api/service-order-payments/[id]/receipt`). The `Sale` (day folio, `SaleItem.description`
carries the job text) is created the moment the pedido becomes **fully paid** (`settleIfPaid` in
`lib/services/orders.ts`) — decided: the service counts for the supplier's cutoff when paid in
full, not when delivered. That sale is **excluded from cash closing and receipt counts**
(`ServiceOrder: { is: null }`), because its money already came in through the payments; every
sale/receipt query that sums cash must keep that filter. Routes: `POST /api/service-orders` (optional
`deposit`), `…/[id]/payments` (anticipo, ≤ what's left), `…/[id]/deliver` (charges what's left, if
anything, then `Entregado`), `…/[id]/cancel` (with an anticipo the UI asks every time: refund it →
`Devolucion` payment, or the store keeps it; a fully paid pedido can't be cancelled). `PATCH` edits
only while "Por entregar" and not fully paid, and never below what's been paid.

- **Folio per supplier letters**: `CO-001` (Compuservi), `CU-001` (Cuatas), `FM-001` (Full Moons).
  `lib/services/folio.ts`: default letters = initials of the first two words, else first two
  letters; overridable per supplier (`Supplier.servicePrefix`, "Letras del folio" in Editar
  proveedor). The sequence is per letters (unique `folio`, retry on `P2002`).
- `Product.byOrder` ("Se hace por pedido", checkbox in the service's detail modal) filters which
  services the new-pedido form lists; if a supplier has none marked, all its services show.
- Inventory → Servicios → "Registrar" links to `service-orders?nuevo=1&servicio={id}`.
- Printing: `ServiceOrderTicket` (58 mm, `dashboard/_components/ticket.tsx`) and a letter PDF
  (`lib/pdf/service-order-report.tsx`). Pendientes on the home page lists "Servicios por entregar".
- A supplier with pedidos can't be deleted (409); a service used in a pedido can't be
  permanently deleted. UI copy uses store words ("Por entregar", "Entregar y cobrar", "Letras del
  folio"), never system terms.

### Supplier promotions ("Promociones")

`SupplierPromotion` (migrations `supplier_promotions`, `promotion_products`): a discount on one
supplier's products — **all of them** (`allProducts`) or **only the chosen ones**
(`SupplierPromotionProduct`) — for a date range (`startsOn`/`endsOn`, `@db.Date`, store days, both
inclusive), `Porcentaje` (1–99) or `CantidadFija` (**pesos off per piece**). Never deleted, only
cancelled (`cancelledAt`). **"One at a time" is per product**: `POST /api/suppliers/[id]/promotions`
rejects (409) a promotion whose dates overlap another non-cancelled one of the supplier if either
is "all products" or they share a product; a supplier can run several at once on different
products. Only that supplier's products can be chosen. Which promotion applies to a product:
`promoAppliesTo` in `lib/promotions.ts`. Card "Promociones" in `suppliers/[id]`
(`supplier-promotions.tsx`).

- The POS applies it automatically: `GET /api/promotions/active` (today's) feeds the product cards
  (struck-through price + "Promo") and the cart; **`POST /api/sales` re-reads active promotions
  itself** and writes the discount into `SaleItem.discount` + `SaleItem.promotionId`, so the
  supplier cutoff already reflects it. A **manual line discount replaces** the promotion (one
  discount per line). The ticket labels the line "Promoción".
- **Not applied** to layaways (they keep the price at reservation) nor to service orders.
- Shared math/labels in `lib/promotions.ts` (`promoUnitDiscount`, `promoLabel`) — used by both
  the POS screen and the server so what's shown is what's charged.

### Supplier monthly cutoff

Suppliers rent shelf space; the store takes **no commission**, so a supplier's "ganancia" for a
period is simply the total sold of their products. `GET /api/suppliers/[id]/cutoff?from&to`
(read-only, inclusive store dates; defaults to the current period) powers the "Corte Mensual" card
in `suppliers/[id]`. Period rules live in `lib/suppliers/cutoff.ts` (pure, tested by hand):

- `cutoffDay` defaults to the store day the supplier was created (set on `POST /api/suppliers`;
  `effectiveCutoffDay` falls back to `createdAt` if it's ever null).
- A period runs from the cutoff day to the day before the next one (day 16 → 16 sep – 15 oct).
- If a month lacks the day (29/30/31), that month's cutoff moves to the **1st of the next month**.

### Home dashboard (`dashboard/page.tsx`)

The "Inicio" page reads everything from one read-only endpoint, `GET /api/dashboard` (store days via
`lib/store-time.ts`): today vs. yesterday sales, active layaways, free stock, a 30-day series split
by where the money went (efectivo / banco / apartados), top products, a recent-activity timeline
(sales, abonos, apartados, altas/retiros) and **pendientes** — today's cash closing (open, or
closed with late cobros), card/transfer receipts without image, supplier cutoffs that just ended
("listo", last 3 days) or end within 7 days (each downloads its PDF right there), clients whose
balance already covers an apartado, and products with one free unit. Its cards live in
`dashboard/_components/home/`. Animations use `motion` (`motion/react`), already a dependency:
sliding tab pill (`layoutId`), Apple-style rings, disclosure rows, self-drawing check. Keep motion
subtle and colors on the `my-*` tokens.

### Printed tickets (58 mm thermal printer)

The store prints on an **EC Line EC-PM-58110** (58 mm thermal paper, ~48 mm printable, ESC/POS,
USB, Windows driver). `dashboard/_components/ticket.tsx` (`SaleTicket`, `PaymentTicket`,
`TicketPreview`) is both the on-screen preview and what gets printed: `lib/print-ticket.ts` copies
that DOM node (minus `[data-print-hide]` nodes, e.g. the supplier shown only in the sales-history
preview) into a hidden iframe with the page's styles and an `@page` of **58 mm × the ticket's
measured height** — `size: 58mm auto` is invalid CSS and Chrome silently falls back to Letter.
Tickets are deliberately black-on-white (paper), not app tokens. Printing is manual (button), never
automatic: "¡Venta completada!" in the POS, "Reimprimir ticket" in Historial de Ventas, and a
comprobante de abono (account status at print time) from each abono row in `clients/[id]`.
`POST /api/sales` returns the same `SALE_ROW_SELECT` shape as `GET /api/sales` so one component
serves both. To skip the print dialog on the register PC, launch Chrome with `--kiosk-printing`.

### PDF reports

Letter-size PDFs generated **in the browser** with `@react-pdf/renderer`, loaded via dynamic
`import()` only when the user clicks "Exportar" (keeps it out of page bundles). Every report wraps
its content in `ReportDocument` from `lib/pdf/report-layout.tsx` — shared header (logo
`public/LOGO_CUATAS.png`, a PNG rendered once from the SVG since react-pdf can't draw the SVG file;
store data from `lib/store-info.ts`) and footer ("Generado el … por {usuario}", page numbers) — plus
its `TableHeader`/`TableRow`/`SummaryBoxes`/`SignatureLines` pieces. Helvetica has accents and ñ but
**no U+2212 minus**: use "-" for negative amounts (`pdfMoney`). No CSV exports (decided).

Built: supplier cutoff (`supplier-cutoff-report.tsx`), supplier stock (`supplier-stock-report.tsx`,
"Existencias" on the Productos card, data from `GET /api/suppliers/[id]/stock-report` with the
period shown in Corte Mensual: stock always shows, sales only within the period, retired products
included and greyed out, no services, rows with neither stock nor sales omitted), cash closing (`cash-closing-report.tsx`,
from what's on screen, so it works on an open corte too), sales history (`sales-history-report.tsx`,
exactly the filtered table rows; summary recomputed from them so totals match) and client statement
(`client-statement-report.tsx`, "Exportar" on the Historial de Movimientos card). Each page loads its
`export*Pdf` with dynamic `import()`. `TableRow` takes `muted` for rows that don't move the account.

To preview a report outside the browser, bundle it with esbuild to ESM
(`--platform=node --format=esm --packages=external`) and `renderToFile` from Node — `tsx` can't load
`@react-pdf/*` (CJS export-map error).

### Store day, cash closing and receipts

- **"What day is it" for the store** goes through `lib/store-time.ts` (`America/Tijuana`):
  `storeDayRange("YYYY-MM-DD")` → UTC `[from, to)` (DST-safe), `storeDateString()`. The server may
  run in UTC, so never derive the store's day from `new Date()` server-side. Client titles use
  `hooks/use-today-label.ts`, which computes the date **after mount** to avoid hydration mismatches.
- **Corte de Caja** (`dashboard/cash-closing/`, `GET/PUT /api/cash-closing`,
  `GET /api/cash-closing/history?from&to` — "Cortes anteriores" sums a period's closed cortes:
  total cobrado, efectivo (cashSales, never the summed floats) and banco): one `CashClosing` row per store day (`date` is `@db.Date`,
  unique), but it covers a **time window**, not the calendar day: `[periodStart, periodEnd)` = from
  the previous closing's `periodEnd` (or start of today if none) to the moment it was closed. So a
  sale made after closing lands in the next corte automatically. Only **today** can be closed; any
  closed corte can be **corrected** (admin-only) — the window never moves, totals are re-snapshotted
  inside it. A past day with no corte has no data (its cobros went to the next one).
- **Two cash boxes:** the main drawer expects opening float (default $200, editable) + POS cash sales.
  **Cash abonos go to a separate "caja de apartados"**, shown on its own line and not added to the
  main expected cash or counted. Layaway liquidations are excluded entirely (that money already came
  in as an abono).
- **Receipts (comprobantes)**: images only, for card/transfer `Sale`s and `Payment`s (`receiptUrl`).
  Uploaded from the cash closing — never at checkout — via `POST /api/sales/[id]/receipt` and
  `POST /api/payments/[id]/receipt` (multipart `file`), to Cloudinary
  `comprobantes/{ventas|abonos}/{folio|id}` (overwrite-in-place). A day can be closed with receipts
  still pending. The sales ticket shows "Ver comprobante adjunto".

### Images

Cloudinary, with **deterministic overwrite-in-place public ids** so re-uploading replaces the asset
instead of accumulating copies: `products/{code}/picture` (`lib/cloudinary/product.ts`) and
`suppliers/{id}-{slug}/logo` (`lib/cloudinary/supplier.ts`, with an accent-stripping
`sanitizeFolderName`). Uploads arrive as `multipart/form-data` via `POST` to the entity route
(e.g. `POST /api/suppliers/[id]` with a `file` field), which writes `secure_url` to the DB. Product
creation uploads *before* insert and cleans up orphans on code collision.
`next.config.ts` allowlists `res.cloudinary.com` for `next/image`.

## Conventions

- **Visual reference pages** — when building or restyling any page, match
  `clients/[id]/page.tsx` and `suppliers/[id]/page.tsx` rather than inventing new styling:
  `Card`/`CardHeader` (icon + title, neutral `variant="secondary"` count `Badge`), ledger rows
  (Historial de Movimientos) as **plain text colored `text-my-{color}-dark` — no background box,
  no per-row badge** — with the total below a `border-t-2` in foreground color, empty states as a
  `bg-muted` circle around a
  `text-muted-foreground` icon, sober buttons (`cursor-pointer`, bare icons), and for a
  fixed-height scroll area `flex-1 min-h-0 overflow-y-auto` on the growing region with
  `shrink-0` on pinned headers/footers (`min-h-0` needed at every ancestor flex/grid level).
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
- `CardActionButton` (`suppliers/_components/card-action-button.tsx`) is the shared corner-action
  button for cards in `suppliers/[id]/page.tsx` (Corte Mensual, Productos, Detalles del Proveedor).
  Use it for any new card-corner action there instead of styling a `Button` ad hoc.
- Editing a supplier is a modal (`edit-supplier-modal.tsx`), not inline in the card anymore —
  `supplier-details-form.tsx` is read-only and only takes `supplier` + `onEdit`. Don't reintroduce
  an `isEditing` prop there.

- **Notifications are toasts, never `alert()`.** `toast.success / error / warning / info(message)`
  from `lib/toast.ts` — a tiny store outside React, so it can be called from any handler without
  hooks. `<Toaster />` (`components/smoothui/basic-toast`, SmoothUI's Basic Toast adapted to the
  `my-*` tokens and stacked) is mounted once in `app/layout.tsx`, above dialogs (`z-[100]`).
  Failures → `error`, validation → `warning`, completed actions → a short `success`. Inline form
  errors inside a modal (`setError`) stay inline.

### UI gotchas already paid for once

- **New theme token not showing up in dev:** after adding a token to `app/globals.css` (e.g.
  `--my-pink`), the dev server kept serving the old CSS — same chunk hash — even after a restart,
  because Next 16's Turbopack dev cache lives on disk in `.next/dev`. Fix: stop `npm run dev`,
  delete `.next`, start again. Also **don't run `npm run build` while the dev server is running**;
  that's what left it stale the first time. It also happens with existing tokens: brand classes
  (`bg-my-green-light`, `bg-my-pink-light`, …) suddenly missing from the served CSS chunk. Lighter
  fix that worked: append a comment to `app/globals.css`, wait a few seconds, revert it — Tailwind
  rescans without a server restart.

- **Mobile overflow:** `<main>` is `overflow-auto`, so anything wider than the screen makes the
  whole page scroll sideways instead of wrapping. Rows of header buttons/filters need `flex-wrap`;
  `table-fixed` tables with % widths need a `min-w-[…rem]` so they slide sideways inside their
  container instead of overlapping columns; full-height "app-like" layouts (`clients/[id]`, POS)
  only lock to the viewport at `lg:` and stack or grow naturally below it. Two subtler causes
  that also bit us: a responsive grid with no base column count (`grid lg:grid-cols-2`) gets an
  implicit `auto` column that grows to its longest text — always add `grid-cols-1`; and shadcn's
  `CardHeader` is itself a grid with an `auto` column, so wide content in it (filter rows) needs
  `<CardHeader className="grid-cols-1">`. Check at 375px by comparing `main.scrollWidth` with
  `clientWidth` (headless Chrome via DevTools protocol works on this machine).
- **Icon-button spacing:** `Button` (and anything built on `buttonVariants()`, including
  `AlertDialogAction`/`AlertDialogCancel`) already has `gap-2` between children. Pass icons bare —
  `<Trash2 />` — never `<Trash2 className="mr-2 h-4 w-4" />`; the manual margin stacks on top of the
  gap and visibly doubles the spacing next to every other icon button in the app.
- **Overriding an `<Input>`'s font size:** the shadcn `Input` base class is `text-base ... md:text-sm`.
  An override like `className="text-2xl"` does **not** win at ≥768px — `text-2xl` and `md:text-sm`
  aren't the same Tailwind-merge group (one has a `md:` modifier, one doesn't), so both survive and
  `md:text-sm` wins in the cascade. Always pair the override with its own `md:` variant, e.g.
  `"text-2xl md:text-2xl"`.
- **`ScrollArea` content getting cut off / not truncating:** Radix wraps `ScrollArea` children in an
  inner `<div style="display:table; min-width:100%">`, which sizes content to its natural width
  instead of the viewport's — rows overflow past the right edge and `truncate` never has a width to
  respect. Fix with `[&>[data-slot=scroll-area-viewport]>div]:block!` on the `ScrollArea`, and keep
  right padding (`pr-4`) on the *inner* content div (not the `ScrollArea` root) so the scrollbar
  doesn't sit on top of it. See `supplier-products-list.tsx`.

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
