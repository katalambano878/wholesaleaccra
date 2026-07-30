-- Staging DB was missing mark_order_paid entirely (payment callbacks/verify broken).
-- Restores the hardened SECURITY DEFINER version from 20260514000500.

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
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF COALESCE(v_caller_role, '') <> 'service_role' AND NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'mark_order_paid: only admin/staff or server-side callers may mark orders paid'
      USING ERRCODE = '42501';
  END IF;

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

  IF updated_order.id IS NOT NULL THEN
      IF (updated_order.metadata->>'stock_reduced') IS NULL THEN
          UPDATE products p
          SET quantity = GREATEST(0, p.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = p.id;

          UPDATE product_variants pv
          SET quantity = GREATEST(0, pv.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = pv.product_id
            AND oi.variant_name IS NOT NULL
            AND oi.variant_name = pv.name;

          UPDATE orders
          SET metadata = metadata || '{"stock_reduced": true}'::jsonb
          WHERE id = updated_order.id;
      END IF;
  ELSE
      SELECT * INTO updated_order FROM orders WHERE order_number = order_ref;
  END IF;

  RETURN to_jsonb(updated_order);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(text, text) TO PUBLIC;
