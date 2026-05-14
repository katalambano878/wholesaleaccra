-- ============================================================================
-- Wholesale pricing + fulfillment method
--
-- Adds first-class support for:
--   1. Dual retail / wholesale pricing on every product (+ per-variant override)
--      with a per-tier minimum order quantity that unlocks the wholesale tier.
--   2. Pickup-vs-delivery fulfillment tracking on orders, with a free-text
--      pickup_location so the admin can record which physical location
--      (CMB, Ablekuma Olebu, …) the customer chose.
--
-- Backfills:
--   - existing rows get NULL wholesale_price (means: no wholesale tier).
--   - existing orders are marked as 'delivery' since that was the previous
--     implicit assumption.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Products: wholesale tier columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_moq integer DEFAULT 1 CHECK (wholesale_moq >= 1);

COMMENT ON COLUMN public.products.wholesale_price IS
  'Per-unit price when the customer buys at or above wholesale_moq. NULL means no wholesale tier — retail price always applies.';
COMMENT ON COLUMN public.products.wholesale_moq IS
  'Minimum quantity required to unlock the wholesale_price tier. Independent of products.moq (which is the overall MOQ for the product).';

-- ---------------------------------------------------------------------------
-- 2. Product variants: per-variant override (falls back to product if NULL)
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_moq integer CHECK (wholesale_moq IS NULL OR wholesale_moq >= 1);

COMMENT ON COLUMN public.product_variants.wholesale_price IS
  'Per-variant wholesale price override. NULL means use the parent product wholesale_price.';
COMMENT ON COLUMN public.product_variants.wholesale_moq IS
  'Per-variant wholesale MOQ override. NULL means use the parent product wholesale_moq.';

-- ---------------------------------------------------------------------------
-- 3. Order items: record which tier was sold at the moment of purchase
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_wholesale boolean DEFAULT false;

COMMENT ON COLUMN public.order_items.is_wholesale IS
  'True if this line was priced using the wholesale tier. Frozen at order time — does not change if the product price later changes.';

-- ---------------------------------------------------------------------------
-- 4. Orders: explicit fulfillment method + pickup location
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('pickup', 'delivery')),
  ADD COLUMN IF NOT EXISTS pickup_location text;

COMMENT ON COLUMN public.orders.fulfillment_method IS
  'How the customer receives the order: pickup at a physical location, or delivery to shipping_address.';
COMMENT ON COLUMN public.orders.pickup_location IS
  'Free-text pickup location key (e.g. ''cmb'', ''ablekuma_olebu''). NULL when fulfillment_method = ''delivery''. Free-text so the admin can add locations without a schema change.';

-- Backfill existing orders: they were all implicitly delivery.
UPDATE public.orders
SET fulfillment_method = 'delivery'
WHERE fulfillment_method IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Helpful indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_method
  ON public.orders (fulfillment_method);

CREATE INDEX IF NOT EXISTS idx_orders_pickup_location
  ON public.orders (pickup_location)
  WHERE pickup_location IS NOT NULL;

-- Make wholesale lookups fast on the storefront.
CREATE INDEX IF NOT EXISTS idx_products_wholesale_price
  ON public.products (wholesale_price)
  WHERE wholesale_price IS NOT NULL;
