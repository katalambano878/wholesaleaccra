-- ============================================================================
-- Harden SECURITY DEFINER helper functions
--
-- All of these are internal — they're invoked either from triggers
-- (handle_new_user, update_product_rating_stats) or from server-side code
-- running with the service_role key (mark_order_paid, upsert_customer_from_order,
-- reduce_stock_on_order, update_customer_stats, get_all_customer_emails,
-- get_all_customer_phones, is_admin_or_staff).
--
-- Without this revoke, anonymous and authenticated users could call them
-- directly via POST /rest/v1/rpc/<fn_name>. The most dangerous case is
-- mark_order_paid — without these REVOKEs, ANY guest could mark ANY order
-- as paid (which also auto-reduces stock).
--
-- service_role bypasses these revokes, so server-side code is unaffected.
-- Triggers run as the table owner, so trigger invocation is unaffected.
-- ============================================================================

-- Internal admin/staff check used by RLS policies — should never be a REST endpoint.
REVOKE EXECUTE ON FUNCTION public.is_admin_or_staff() FROM PUBLIC, anon, authenticated;

-- Order payment + stock — server-side only (webhook & admin actions).
REVOKE EXECUTE ON FUNCTION public.mark_order_paid(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reduce_stock_on_order(uuid) FROM PUBLIC, anon, authenticated;

-- Customer CRM helpers — admin/staff only via service role.
REVOKE EXECUTE ON FUNCTION public.upsert_customer_from_order(text, text, text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_customer_stats(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_customer_emails() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_customer_phones() FROM PUBLIC, anon, authenticated;

-- Trigger-only functions — should not be callable as RPCs at all.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_product_rating_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
