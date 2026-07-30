-- Plain-Postgres helpers that mimic Supabase Auth GUCs.
-- Required for is_admin_or_staff() / RLS predicates / mark_order_paid guards
-- when the app sets request.jwt.claim.* via the node-pg pool.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt() TO PUBLIC;

-- Payment / SMS audit helpers for idempotent confirmations
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created
  ON public.orders (payment_status, created_at DESC)
  WHERE payment_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders (order_number);
