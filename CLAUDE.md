# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spanish-language (es-MX) retail back-office for a small consignment store: suppliers, inventory,
clients with credit balances, layaways ("apartados"), and a POS screen.

Check `TODO.md` for agreed-but-not-built work. Finished items are marked `- [x]` and moved to
its dated **Completado** section at the bottom (don't just delete them). Currently open: a
per-supplier inventory history screen; on `clients/[id]`, each apartado's date on its card; what to do with a client's leftover credit (a "limpiar saldo"
option); wiring up the deliberately disabled "Registrar" button in the inventory Servicios tab; a real
"permanently delete" action distinct from today's soft-delete "Eliminar producto"; and small
cleanups (flashing empty states on other pages, raw colors / a typo in the add-* modals).

The list pages `suppliers/page.tsx` and `clients/page.tsx` share one layout: title left, search +
primary CTA right on the same row, then a 3-card highlights row (`bg-my-{yellow,blue,green}-light`
+ matching `-dark` text, in that order), then a `grid-cols-2 md:grid-cols-4` card grid. Keep new
list pages consistent with it.

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
(`@import 'tailwindcss'`, `@custom-variant dark`, oklch vars, plus 6 brand tokens: `--my-blue`,
`--my-yellow`, `--my-red`, `--my-green`, `--my-orange`, `--my-purple`). Do not create a
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
  liquidation. Deleting a client requires **no history at all** (no `Payment`, `Layaway` or `Sale`
  rows) — its sales feed suppliers' monthly cutoffs, so clients with history are never deleted (409).
- `POST /api/clients/[id]/layaway/liquidate` accepts an optional `payShortfall: { method }` (used by
  "Liquidar Cuenta"): if the balance doesn't cover the items, it creates a `Payment` for exactly the
  shortfall — computed server-side, never taken from the body — inside the same transaction before
  liquidating. Stock is decremented **per product by unit count**, since several items can share a
  product.
- Product `code` is unique (`CT-XXXXXXXX`); creation retries on `P2002` with a new code.

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

`GET /api/products/[id]/stock` returns one product's movements, newest first, `User` included —
built for a history screen that doesn't exist yet (see `TODO.md`).

UI: `stock-movement-modal.tsx`, one component for both directions, opened from "Agregar unidades" /
"Retirar mercancía" in `product-details-modal.tsx`. Those buttons — and the quantity field itself —
only show once you're editing, only for `type !== "SERVICE"`, and quantity is **never** directly
editable; it only moves through this endpoint. Don't add a quantity `<Input>` back into that modal.

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
endpoint. Don't assume checkout writes to the database. Consequently `GET /api/suppliers/sales`
(per-supplier sales total for a `from`/`to` range, used by the "Más ventas en {mes}" card on the
suppliers page) only counts liquidated apartados until POS sales are persisted.

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

### UI gotchas already paid for once

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
