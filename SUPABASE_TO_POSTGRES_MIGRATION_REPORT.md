# Supabase → Postgres Migration Report — wholesaleaccra

**Date:** 2026-07-30  
**Branch:** `staging/plain-postgres`  
**Shape:** A — shimmed supabase-js → `/rest/v1` `/auth/v1` `/storage/v1` + `DATABASE_URL`

See also: `docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`

---

## Feature matrix

| Supabase feature | Replacement | Status |
|------------------|-------------|--------|
| PostgREST queries | `lib/db/supabase-compat.ts` + `/rest/v1` | Working (auth hardened) |
| Auth (GoTrue) | `lib/db/auth.ts` + `/auth/v1` | Working (recover stub) |
| Storage | Local disk + `/storage/v1` | Working (upload auth added) |
| RLS | App-layer checks on REST + admin middleware | Partial — not full RLS parity |
| RPC `mark_order_paid` | Same SQL function + JWT GUCs | Restored on staging |
| RPC `upsert_customer_from_order` | Same | Present |
| RPC `update_customer_stats` | Same | Present |
| Realtime | None | Not used / not replaced |
| Edge functions | Next.js API routes | N/A |
| `auth.uid()` | `auth.uid()` SQL helper reading JWT GUC | Applied |

---

## Remaining Supabase references

- `@supabase/supabase-js` still used as the **browser/client API shape**; URL points at app origin in plain-PG mode.
- `lib/supabase.ts` / `lib/supabase-admin.ts` names retained for minimal churn.
- `supabase/migrations/` remains the schema source of truth.
- Package keyword/`supabase` CLI scripts are legacy; prefer `npm run db:migrate` / fleet SQL.

---

## Schema notes (staging)

- Database name: `wholesaleaccra_staging` (not `store_wholesaleaccra`).
- Tables: 31 public tables; ~10 products, 1 order at audit time.
- Applied 2026-07-30:
  - `20260730000000_plain_pg_auth_uid_helpers.sql`
  - `20260730000001_restore_mark_order_paid.sql`

---

## Env mapping

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Enables plain-PG mode |
| `NEXT_PUBLIC_USE_PLAIN_PG` | Middleware admin JWT path (also auto if DATABASE_URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Must be **app origin** |
| `AUTH_JWT_SECRET` | Signs/verifies local JWTs |
| `STORAGE_ROOT` | Upload filesystem root |
| Drop after cutover | Hosted Supabase URL/keys (except placeholder anon/service for client) |
