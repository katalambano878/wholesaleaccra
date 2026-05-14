/**
 * Retail vs. wholesale pricing logic.
 *
 * Used in four places — and they MUST agree:
 *   - Storefront product card  ("Wholesale: GH₵X at Y+ units")
 *   - Product detail page      (auto-switches active price when qty ≥ wholesale_moq)
 *   - Cart                     (re-prices lines live as quantity changes)
 *   - Checkout / order_items   (freezes is_wholesale per line)
 *
 * Wholesale rules:
 *   - A product has a wholesale tier when `wholesale_price` is set and > 0.
 *   - The tier "unlocks" when the line quantity reaches `wholesale_moq`
 *     (clamped to >= 1).
 *   - Variant `wholesale_price`/`wholesale_moq` override the parent product
 *     when present (so a "premium" variant can have a different bulk price).
 *   - When no wholesale tier is configured, retail price always applies.
 */

export type Tier = 'retail' | 'wholesale';

export interface TierInput {
  /** Retail unit price (required — never null on a saved product). */
  price: number;
  /** Wholesale unit price (null/undefined disables the wholesale tier). */
  wholesale_price?: number | null;
  /**
   * Minimum quantity that unlocks the wholesale tier.
   * Defaults to 1 if missing (i.e. wholesale price applies from the first unit).
   */
  wholesale_moq?: number | null;
}

export interface ResolvedTier {
  /** Which tier applies for the supplied quantity. */
  tier: Tier;
  /** Per-unit price to charge. */
  unitPrice: number;
  /** True when the product has any wholesale tier at all. */
  hasWholesaleTier: boolean;
  /** The wholesale unit price (null when no wholesale tier). */
  wholesalePrice: number | null;
  /** Minimum quantity to unlock wholesale (null when no wholesale tier). */
  wholesaleMoq: number | null;
  /**
   * Units left before the wholesale tier kicks in.
   * Positive when the customer is still in retail territory; 0 once unlocked.
   * Null when there's no wholesale tier.
   */
  unitsToUnlock: number | null;
}

/**
 * Resolve which tier applies for a given product/variant at a given quantity.
 *
 * Pass the variant if you have one — variant `wholesale_price` / `wholesale_moq`
 * override the parent product when set. Otherwise pass just the product.
 */
export function resolveTier(input: TierInput, quantity: number): ResolvedTier {
  const retail = Number(input.price) || 0;
  const wholesale =
    input.wholesale_price != null && Number(input.wholesale_price) > 0
      ? Number(input.wholesale_price)
      : null;
  const moq =
    wholesale != null
      ? Math.max(1, Math.floor(Number(input.wholesale_moq) || 1))
      : null;

  const hasWholesaleTier = wholesale != null;
  const qty = Math.max(0, Math.floor(quantity));

  if (hasWholesaleTier && moq != null && qty >= moq) {
    return {
      tier: 'wholesale',
      unitPrice: wholesale!,
      hasWholesaleTier: true,
      wholesalePrice: wholesale,
      wholesaleMoq: moq,
      unitsToUnlock: 0,
    };
  }

  return {
    tier: 'retail',
    unitPrice: retail,
    hasWholesaleTier,
    wholesalePrice: wholesale,
    wholesaleMoq: moq,
    unitsToUnlock: hasWholesaleTier && moq != null ? Math.max(0, moq - qty) : null,
  };
}

/**
 * Merge a product + an optional variant into a single TierInput.
 * Variant wholesale fields override product wholesale fields when present.
 *
 * Variant `price` always overrides product `price` (that's the existing model).
 */
export function mergeTierInput(
  product: TierInput,
  variant?: TierInput | null,
): TierInput {
  if (!variant) return product;
  return {
    price: variant.price ?? product.price,
    wholesale_price:
      variant.wholesale_price != null && Number(variant.wholesale_price) > 0
        ? variant.wholesale_price
        : product.wholesale_price ?? null,
    wholesale_moq:
      variant.wholesale_moq != null && Number(variant.wholesale_moq) > 0
        ? variant.wholesale_moq
        : product.wholesale_moq ?? null,
  };
}

/** Convenience: format a GHS price with two decimals. */
export const formatGHS = (val: number): string => `GH\u20B5${(Number(val) || 0).toFixed(2)}`;
