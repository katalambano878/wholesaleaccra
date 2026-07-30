# Repair Changelog — 2026-07-30

## Database

- Applied on `wholesaleaccra_staging`:
  - `20260730000000_plain_pg_auth_uid_helpers.sql` — `auth.uid()` / `auth.role()` / `auth.jwt()`, indexes, `confirmation_sent_at`
  - `20260730000001_restore_mark_order_paid.sql` — function was **missing**
  - `20260730000002_fix_mark_order_paid_text_status.sql` — text `status` columns (no enum cast)

## Core platform

| File | Change |
|------|--------|
| `lib/db/jwt-context.ts` | **New** — transaction-scoped JWT GUCs |
| `lib/db/rest-auth.ts` | **New** — REST/RPC/storage caller auth |
| `lib/db/supabase-compat.ts` | RPC JWT context; parameterized `is()`; service_role client opts |
| `lib/supabase-admin.ts` | Creates service_role compat client |
| `lib/db/storage.ts` | Honor `upsert`; reject overwrite when false |
| `lib/notifications.ts` | Use admin client; SMS timeout; confirmation dedupe |
| `middleware.ts` | Fail closed; align JWT secret; auto plain-PG when `DATABASE_URL` |
| `app/rest/v1/[table]/route.ts` | Auth + protected order fields |
| `app/rest/v1/rpc/[fn]/route.ts` | Auth + admin RPC gate |
| `app/storage/v1/object/.../route.ts` | Auth on upload/delete |

## Payments / SMS

| File | Change |
|------|--------|
| `app/api/payment/moolre/route.ts` | Store `moolre_external_ref`; timeout |
| `app/api/payment/moolre/verify/route.ts` | Verify with stored ref; amount required; payment_method column |
| `app/api/payment/moolre/callback/route.ts` | Secret required; AND statuses; amount required; metadata merge |
| `app/api/cron/payment-reminders/route.ts` | Require `CRON_SECRET` |
| `vercel.json` | Cron every 15 minutes |

## Frontend

| File | Change |
|------|--------|
| `app/(store)/shop/page.tsx` | Category filter via `category_id` |
| `app/admin/orders/ProductSalesStats.tsx` | Paid order IDs then chunked items |
| `app/(store)/order-success/page.tsx` | Pending/failed/paid UI states |

## Docs / env

- `FULL_SYSTEM_AUDIT.md`, `PAYMENT_AND_CALLBACK_AUDIT.md`, `PERFORMANCE_REPORT.md`, `SUPABASE_TO_POSTGRES_MIGRATION_REPORT.md`, `REPAIR_CHANGELOG.md`
- `.env.example` updated for plain-PG trio + JWT/storage

## Packages

- No intentional dependency adds/removes in this pass (local `npm install` may refresh lock integrity).

## Manual actions required

1. Redeploy Coolify app `wholesaleaccra-staging`.
2. Confirm env: `DATABASE_URL`, `NEXT_PUBLIC_USE_PLAIN_PG=true`, `NEXT_PUBLIC_SUPABASE_URL`=staging origin, `AUTH_JWT_SECRET`, `MOOLRE_*`, `MOOLRE_CALLBACK_SECRET`, `CRON_SECRET`.
3. Schedule external cron hitting `/api/cron/payment-reminders` if not on Vercel.
4. Sandbox Moolre payment test after deploy.
5. Apply the three new SQL migrations to any other environments before cutover.
