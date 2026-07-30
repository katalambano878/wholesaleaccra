# Full System Audit — Accra Wholesale Clothing

**Date:** 2026-07-30  
**Branch:** `staging/plain-postgres`  
**Staging:** https://wholesaleaccra-staging.169-58-8-203.sslip.io  
**DB:** `fleet-postgres` / `wholesaleaccra_staging`

---

## Baseline (before repairs)

| Check | Result |
|-------|--------|
| Git branch | `staging/plain-postgres` @ `215c0ce` |
| Staging container | healthy (Coolify `ndhhxnl8…`) |
| `GET /` `/shop` `/cart` `/checkout` `/auth/login` `/admin/login` | HTTP 200 |
| Storefront APIs | HTTP 200 |
| `/rest/v1/products` `/auth/v1/health` | HTTP 200 |
| Local `node_modules` | Partially present; `typescript` missing until reinstall |
| Uncommitted prior work | invoice, inventory, migration guide (preserved) |
| `mark_order_paid` in staging DB | **MISSING** (critical) |
| Hubtel / Paystack | Not implemented in this repo |

---

## Architecture summary

Shape A cutover: browser `@supabase/supabase-js` → app-origin `/rest/v1`, `/auth/v1`, `/storage/v1` backed by `node-pg` (`lib/db/*`). Server admin uses `supabaseAdmin` → in-process compat with `service_role` JWT GUCs.

| Layer | Implementation |
|-------|----------------|
| DB client | `pg` Pool (`lib/db/pool.ts`) |
| Query shim | `lib/db/supabase-compat.ts` |
| Auth | bcrypt + jose JWT (`lib/db/auth.ts`, `/auth/v1`) |
| Storage | Local disk (`lib/db/storage.ts`, `/storage/v1`) |
| Payments | Moolre only |
| SMS | Moolre VAS |
| Email | Resend |

---

## Route inventory (high level)

### Public storefront
`/`, `/shop`, `/product/[slug]`, `/categories`, `/cart`, `/checkout`, `/wishlist`, `/blog`, `/blog/[id]`, `/about`, `/contact`, `/faqs`, `/help`, `/help/article/[id]`, `/shipping`, `/returns`, `/returns/confirmation`, `/privacy`, `/terms`, `/support/ticket`, `/support/tickets`, `/order-tracking`, `/order-success`, `/pay/[orderId]`, `/offline`, `/maintenance`, `/pwa-settings`

### Auth
`/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/account`, `/account/invoice/[id]`, `/account/privacy`, `/account/verify-email`, `/account/verify-phone`

### Admin
`/admin`, `/admin/login`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/products/import`, `/admin/categories`, `/admin/orders`, `/admin/orders/[id]`, `/admin/customers`, `/admin/customers/[id]`, `/admin/inventory`, `/admin/coupons`, `/admin/analytics`, `/admin/pos`, `/admin/reviews`, `/admin/blog`, `/admin/notifications`, `/admin/modules`, `/admin/customer-insights`, `/admin/test-sms`

### API / shims
- `/api/payment/moolre`, `/callback`, `/verify`
- `/api/notifications`, `/api/cron/payment-reminders`
- `/api/storefront/products`, `/categories`
- `/api/admin/products/import(+template)`, `/api/recaptcha/verify`
- `/rest/v1/[table]`, `/rest/v1/rpc/[fn]`
- `/auth/v1/[...path]`
- `/storage/v1/object/**`

---

## Root causes found

1. **Missing `mark_order_paid` RPC** on staging Postgres — payment callback/verify could never mark orders paid.
2. **No JWT GUC context** on pool RPC calls — even after restoring the function, `service_role` / `auth.uid()` guards would fail.
3. **Dotted embed filters** (`categories.slug`, `orders.payment_status`) unsupported by compat → shop category filter & admin sales stats broken.
4. **Verify used wrong `externalref`** (`ORD-xxx` vs `ORD-xxx-R{timestamp}`).
5. **Open `/rest/v1` CRUD + RPC** with no auth (RLS not enforced on pool role).
6. **Callback secret optional** → forgeable paid status when unset.
7. **Middleware / JWT secret drift** between mint and verify paths.
8. **Order-success UI** claimed “Confirmed / Total Paid” while still pending.

---

## Fixes applied (this audit)

- JWT transaction context for RPCs (`lib/db/jwt-context.ts`)
- `supabaseAdmin` as `service_role`
- REST/RPC authorization (`lib/db/rest-auth.ts`)
- Storage mutation auth + upsert semantics
- Payment init stores `moolre_external_ref`; verify uses it; callback fail-closed; AND status; amount required; metadata merge on failure
- Notification dedupe via `metadata.confirmation_sent_at`
- Shop + ProductSalesStats flat-column filters
- Order-success pending/failed UI
- Cron requires `CRON_SECRET`; schedule `*/15 * * * *`
- Migrations: `auth.uid()` helpers + restore `mark_order_paid` (applied to `wholesaleaccra_staging`)
- Middleware fail-closed + plain-PG detection via `DATABASE_URL`

---

## Remaining risks

- REST still allows broad authenticated reads (not full ownership RLS).
- Password recovery (`/auth/v1/recover`) is a stub.
- Hubtel/Paystack not in product scope for this store.
- Staging app must be redeployed for code fixes to go live.
- Confirm Coolify env: `MOOLRE_CALLBACK_SECRET`, `AUTH_JWT_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_USE_PLAIN_PG`, `NEXT_PUBLIC_SUPABASE_URL` = app origin.
