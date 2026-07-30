# Payment & Callback Audit — Accra Wholesale Clothing

**Date:** 2026-07-30  
**Gateways in repo:** Moolre only (Hubtel / Paystack: absent)

---

## Moolre flow

1. Checkout / pay page creates or loads order (`payment_status=pending`).
2. `POST /api/payment/moolre` loads order from DB, uses **server `order.total`**, builds `externalref = {order_number}-R{timestamp}`, stores `metadata.moolre_external_ref`.
3. Customer pays on Moolre; browser redirects to `/order-success?order=…&payment_success=true` (UI only).
4. Moolre POSTs `/api/payment/moolre/callback` (authoritative when secret + statuses + amount OK).
5. Order-success waits ~3s then `POST /api/payment/moolre/verify` which polls Moolre `/embed/status` with stored `externalref`.
6. Both paths call `mark_order_paid` under `service_role` JWT GUCs, then `sendOrderConfirmation` (deduped).

| Concern | Status |
|---------|--------|
| Init amount from DB | ✅ |
| Redirect alone marks paid | ✅ Blocked |
| Callback secret | ✅ Required (fail closed in prod) |
| Success = api AND tx status | ✅ |
| Amount required on callback | ✅ |
| Verify externalref | ✅ Uses stored attempt ref |
| Duplicate notifications | ✅ Metadata claim |
| Delayed fail after paid | ✅ Skipped |
| `mark_order_paid` on staging DB | ✅ Restored 2026-07-30 |

---

## Callback routes

| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/api/payment/moolre/callback` | POST | `MOOLRE_CALLBACK_SECRET` | Middleware does not block |
| `/api/payment/moolre/verify` | POST | Rate limit | Server→Moolre verify |
| `/api/payment/moolre` | POST | Rate limit | Init |

---

## Hubtel / Paystack

Not present in this codebase. No initiation, callback, or verify routes. Do not configure those gateways for this store unless product scope expands.

---

## Manual actions

1. Set `MOOLRE_CALLBACK_SECRET` in Coolify and register the same value with Moolre.
2. Confirm Moolre callback URL: `{NEXT_PUBLIC_APP_URL}/api/payment/moolre/callback`
3. Redeploy staging after this branch ships.
4. Run a sandbox payment end-to-end (init → pay → callback → order `paid`).
