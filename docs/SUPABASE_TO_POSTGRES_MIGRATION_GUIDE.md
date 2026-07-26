# Accra Wholesale Clothing — Supabase → plain Postgres cutover

**Shape:** A — shimmed `@supabase/supabase-js` → app `/rest/v1`, `/auth/v1`, `/storage/v1` + `DATABASE_URL`  
**Repo:** `katalambano878/wholesaleaccra` (adjust if fork differs)  
**Branch:** `staging/plain-postgres`  
**Coolify staging:** `wholesaleaccra-staging` (`ndhhxnl8rpa5ggk6eimdd3b3`)  
**Staging URL:** https://wholesaleaccra-staging.169-58-8-203.sslip.io  
**DB:** `fleet-postgres` / `store_wholesaleaccra` (provision with `sudo fleet db provision wholesaleaccra`)

See also: store hardening playbook in the big-vps workspace (`STORE_HARDENING_PLAYBOOK.md`).

## Env cutover trio (set together in Coolify)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgresql://…@fleet-postgres:5432/store_wholesaleaccra` |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging/prod app origin (not `*.supabase.co`) — e.g. staging URL above until custom domain |

Also usually required: JWT secrets, `NEXT_PUBLIC_APP_URL`, `STORAGE_ROOT` / `STORAGE_PUBLIC_URL`, Resend + payment keys. **Do not commit real values.**

## Hardening notes (Jul 2026)

- [x] Phase A: `sw-v2.5-wholesale`, `lib/format-money.ts`, `app/error.tsx`, `app/admin/error.tsx`
- [x] Phase B: `images.unoptimized`; drop `*.supabase.co` / `via.placeholder.com` remotePatterns
- [x] Money display → `money()` / `asNumber()` on storefront + admin paths
- [x] Cron payment reminders → `supabaseAdmin`
- [x] Order history: Track / Reorder / Invoice / Help; hide Bulk Restock stub

## Verify

```bash
BASE=https://wholesaleaccra-staging.169-58-8-203.sslip.io
ssh big-vps "sudo docker ps --format '{{.Image}} {{.Status}}' | grep ndhhxnl8"
curl -s "$BASE/service-worker.js" | head -n 3
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/shop"
```
