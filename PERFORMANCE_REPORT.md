# Performance Report — Accra Wholesale Clothing

**Date:** 2026-07-30

---

## Baseline observations

| Area | Finding |
|------|---------|
| Staging homepage / shop | HTTP 200; container healthy |
| Freezing risk | External Moolre payment/SMS calls without timeouts could hang API workers |
| Slow queries | Unbounded admin sales query via broken dotted filters; now chunked by paid order IDs |
| Shop category filter | Failed entirely under plain PG (dotted filter) → empty/error UX |
| Connection pool | Singleton `pg` Pool, `PG_POOL_MAX` default 10 |

---

## Fixes

1. **Timeouts** on Moolre payment init (20s), verify (15s), SMS (15s) with `AbortController`.
2. **Indexes** added: `orders(payment_status, created_at)` partial for pending/failed; `orders(order_number)`.
3. **Shop filter** rewritten to `category_id` IN (…) — avoids embed-filter failure and unnecessary join filtering.
4. **Product sales stats** resolves paid order IDs first, then chunks `order_items` queries (max 100 IDs).
5. **Cron** every 15 minutes (was daily) so payment reminders match product copy.

---

## Remaining recommendations

- Add CDN/caching for public product list API responses with short TTL.
- Paginate large admin order/customer lists if datasets grow.
- Consider virtualization for very large admin tables.
- Monitor pool usage under Coolify concurrent workers (`PG_POOL_MAX` × workers).
- Replace client-side full product fetches with `/api/storefront/products` consistently.

---

## Measurements

Automated Lighthouse / EXPLAIN ANALYZE not run in this pass (no local DB URL). Staging HTTP smoke: core pages 200. Re-measure after redeploy with:

```bash
BASE=https://wholesaleaccra-staging.169-58-8-203.sslip.io
curl -s -o /dev/null -w "%{http_code} %{time_total}\n" "$BASE/" "$BASE/shop"
```
