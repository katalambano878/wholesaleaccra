# Accra Wholesale Clothing — Supabase → plain Postgres cutover

**Shape:** A — shimmed `@supabase/supabase-js` → app `/rest/v1`, `/auth/v1`, `/storage/v1` + `DATABASE_URL`  
**Repo:** `katalambano878/wholesaleaccra` (adjust if fork differs)  
**Branch:** `staging/plain-postgres`  
**Coolify staging:** `wholesaleaccra-staging` (`ndhhxnl8rpa5ggk6eimdd3b3`)  
**Staging URL:** https://wholesaleaccra-staging.169-58-8-203.sslip.io  
**DB:** `fleet-postgres` / `wholesaleaccra_staging` (live staging name; fleet may also provision `store_wholesaleaccra`)

See also: store hardening playbook in the big-vps workspace (`STORE_HARDENING_PLAYBOOK.md`), plus root audit docs (`FULL_SYSTEM_AUDIT.md`, `PAYMENT_AND_CALLBACK_AUDIT.md`).

## Env cutover trio (set together in Coolify)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgresql://…@fleet-postgres:5432/wholesaleaccra_staging` |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging/prod app origin (not `*.supabase.co`) — e.g. staging URL above until custom domain |

Also usually required: `AUTH_JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `STORAGE_ROOT` / `STORAGE_PUBLIC_URL`, `MOOLRE_CALLBACK_SECRET`, `CRON_SECRET`, Resend + Moolre keys. **Do not commit real values.**

## Hardening notes (Jul 2026)

- [x] Phase A: `sw-v2.5-wholesale`, `lib/format-money.ts`, `app/error.tsx`, `app/admin/error.tsx`
- [x] Phase B: `images.unoptimized`; drop `*.supabase.co` / `via.placeholder.com` remotePatterns
- [x] Money display → `money()` / `asNumber()` on storefront + admin paths
- [x] Cron payment reminders → `supabaseAdmin`
- [x] Order history: Track / Reorder / Invoice / Help; hide Bulk Restock stub
- [x] JWT GUCs for RPCs; restore `mark_order_paid` (was missing on staging)
- [x] REST/RPC/storage auth; Moolre callback/verify hardening; shop category filter fix

## Verify

```bash
BASE=https://wholesaleaccra-staging.169-58-8-203.sslip.io
ssh big-vps "sudo docker ps --format '{{.Image}} {{.Status}}' | grep ndhhxnl8"
curl -s "$BASE/service-worker.js" | head -n 3
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/shop"
```

## SQL to apply on new environments

```bash
# From repo root, pipe migrations to the target DB:
# 20260730000000_plain_pg_auth_uid_helpers.sql
# 20260730000001_restore_mark_order_paid.sql
# 20260730000002_fix_mark_order_paid_text_status.sql
```
