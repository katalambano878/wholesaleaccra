-- ============================================================================
-- Restore EXECUTE on functions that MUST be callable by client roles
--
-- This corrects 20260514000400_harden_security_definer_functions.sql, which
-- was too aggressive. It revoked EXECUTE on three categories of function:
--
--   (A) trigger-only functions             — correct to revoke (Postgres
--                                            invokes them as the table owner).
--   (B) server-side-only RPCs               — correct to revoke (service_role
--                                            key bypasses revokes anyway).
--   (C) RLS predicates + client-callable RPCs — INCORRECT to revoke. These
--       are exactly what this migration restores.
--
-- The breakage symptom on the storefront was:
--   "permission denied for function is_admin_or_staff (42501)"
-- because EVERY storefront query against products / blog_posts / categories /
-- etc. evaluates a row-level policy that calls is_admin_or_staff(). Once the
-- function call itself was denied to anon/authenticated, every read failed.
--
-- Silently broken (same root cause, just on lesser-tested code paths):
--   - guest checkout calls upsert_customer_from_order from the browser
--   - admin POS calls mark_order_paid from the browser
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. is_admin_or_staff() — RLS predicate, must be callable by everyone.
--
-- This is a boolean predicate that returns true ONLY when the caller's
-- profile.role is 'admin' or 'staff'. Granting EXECUTE doesn't give clients
-- any data they wouldn't already have; it just lets the policy engine
-- evaluate the policy on their behalf.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. upsert_customer_from_order(...) — called from the customer's browser
--    during checkout (anon for guests) and from the admin POS (authenticated).
--
-- Security note: this function lets the caller create / merge a customer
-- record by email or phone. That's the same exposure the schema has shipped
-- with since day one and is the standard Supabase guest-checkout pattern.
-- If you later want to lock it down, route checkout through a server-side
-- Next.js handler that uses the service_role key.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.upsert_customer_from_order(
    text, text, text, text, text, uuid, jsonb
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. mark_order_paid(text, text) — called from admin POS (authenticated
--    browser session) AND from payment webhooks (server-side, service_role).
--
-- Before the revoke, ANY anon caller could mark ANY order paid (and trigger
-- the side-effect of reducing stock). Re-granting blindly would reopen that
-- hole, so we redefine the function with an internal `is_admin_or_staff()`
-- guard, then grant EXECUTE to authenticated only.
--
-- service_role bypasses both the grant and the guard (it bypasses RLS and
-- has implicit EXECUTE), so the payment webhooks continue to work without
-- the caller having a profile row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_paid(order_ref text, moolre_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_order orders;
  v_caller_role text;
BEGIN
  -- Allow service_role (webhook / server-side) unconditionally. For everyone
  -- else, require an admin/staff profile. We check both the JWT-asserted role
  -- (current_setting) and the profile-level role.
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF COALESCE(v_caller_role, '') <> 'service_role' AND NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'mark_order_paid: only admin/staff or server-side callers may mark orders paid'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Update the order to paid
  UPDATE orders
  SET
    payment_status = 'paid',
    status = CASE
        WHEN status = 'pending' THEN 'processing'::order_status
        WHEN status = 'awaiting_payment' THEN 'processing'::order_status
        ELSE status
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) ||
               jsonb_build_object(
                   'moolre_reference', moolre_ref,
                   'payment_verified_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
               )
  WHERE order_number = order_ref
  RETURNING * INTO updated_order;

  -- 2. Reduce stock (only if we found the order and haven't reduced yet)
  IF updated_order.id IS NOT NULL THEN
      IF (updated_order.metadata->>'stock_reduced') IS NULL THEN

          -- Reduce main product stock
          UPDATE products p
          SET quantity = GREATEST(0, p.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = p.id;

          -- Reduce variant stock (match by product_id + variant_name)
          UPDATE product_variants pv
          SET quantity = GREATEST(0, pv.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = pv.product_id
            AND oi.variant_name IS NOT NULL
            AND oi.variant_name = pv.name;

          -- Flag as reduced
          UPDATE orders
          SET metadata = metadata || '{"stock_reduced": true}'::jsonb
          WHERE id = updated_order.id;

      END IF;
  ELSE
      -- Fallback search
      SELECT * INTO updated_order FROM orders WHERE order_number = order_ref;
  END IF;

  RETURN to_jsonb(updated_order);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- The following stay revoked. Listed here as documentation so future
-- maintainers can see *why* each one is locked down:
--
--   reduce_stock_on_order(uuid)
--       Not called from app code. mark_order_paid handles stock inline.
--
--   update_customer_stats(text, numeric)
--       Only called from payment webhooks via the service_role key, which
--       bypasses the revoke.
--
--   get_all_customer_emails() / get_all_customer_phones()
--       Admin reporting helpers; not called from the client app today.
--
--   handle_new_user() / update_product_rating_stats() /
--   update_updated_at_column()
--       Trigger functions. Postgres invokes them as the table owner, so
--       client-role EXECUTE grants are not needed and revoking blocks a
--       direct-RPC abuse vector at no cost.
-- ---------------------------------------------------------------------------
