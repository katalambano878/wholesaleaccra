'use client';

import { useState } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { useCart } from '@/context/CartContext';
import { formatGHS } from '@/lib/pricing';

// Map common color names to hex values for swatches
const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#EF4444', blue: '#3B82F6',
  navy: '#1E3A5F', green: '#22C55E', yellow: '#EAB308', orange: '#F97316',
  pink: '#EC4899', purple: '#A855F7', brown: '#92400E', beige: '#D4C5A9',
  grey: '#6B7280', gray: '#6B7280', cream: '#FFFDD0', teal: '#14B8A6',
  maroon: '#800000', coral: '#FF7F50', burgundy: '#800020', olive: '#808000',
  tan: '#D2B48C', khaki: '#C3B091', charcoal: '#36454F', ivory: '#FFFFF0',
  gold: '#FFD700', silver: '#C0C0C0', rose: '#FF007F', lavender: '#E6E6FA',
  mint: '#98FB98', peach: '#FFDAB9', wine: '#722F37', denim: '#1560BD',
  nude: '#E3BC9A', camel: '#C19A6B', sage: '#BCB88A', rust: '#B7410E',
  mustard: '#FFDB58', plum: '#8E4585', lilac: '#C8A2C8', stone: '#928E85',
  sand: '#C2B280', taupe: '#483C32', mauve: '#E0B0FF', sky: '#87CEEB',
  forest: '#228B22', cobalt: '#0047AB', emerald: '#50C878', scarlet: '#FF2400',
  aqua: '#00FFFF', turquoise: '#40E0D0', indigo: '#4B0082', crimson: '#DC143C',
  magenta: '#FF00FF', cyan: '#00FFFF', chocolate: '#7B3F00', coffee: '#6F4E37',
};

export function getColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  // Try partial match (e.g. "Light Blue" -> "blue")
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export interface ColorVariant {
  name: string;
  hex: string;
}

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  inStock?: boolean;
  maxStock?: number;
  moq?: number;
  hasVariants?: boolean;
  minVariantPrice?: number;
  colorVariants?: ColorVariant[];
  /** Optional wholesale unit price — when set, shown as "Wholesale: GH₵X at Y+". */
  wholesalePrice?: number | null;
  /** Quantity at which wholesale price unlocks (defaults to 1). */
  wholesaleMoq?: number | null;
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  originalPrice,
  image,
  rating = 5,
  reviewCount = 0,
  badge,
  inStock = true,
  maxStock = 50,
  moq = 1,
  hasVariants = false,
  minVariantPrice,
  colorVariants = [],
  wholesalePrice,
  wholesaleMoq,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const displayPrice = hasVariants && minVariantPrice ? minVariantPrice : price;
  const discount = originalPrice ? Math.round((1 - displayPrice / originalPrice) * 100) : 0;
  const MAX_SWATCHES = 5;

  const hasWholesale =
    wholesalePrice != null && Number(wholesalePrice) > 0 && Number(wholesalePrice) < displayPrice;
  const wholesaleThreshold = Math.max(1, Number(wholesaleMoq) || 1);

  const formatPrice = (val: number) => formatGHS(val);

  return (
    <div className="group bg-transparent rounded-lg h-full flex flex-col hover-lift px-0.5 sm:px-0">
      <Link href={`/product/${slug}`} className="relative block aspect-[3/4] overflow-hidden rounded-lg sm:rounded-xl bg-gray-100 mb-2 sm:mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300">
        <LazyImage
          src={image}
          alt={name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
        />

        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-2">
          {badge && (
            <span className="bg-white/90 backdrop-blur text-gray-900 border border-gray-100 text-[8px] sm:text-[10px] uppercase tracking-wider font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded sm:rounded-md shadow-sm leading-tight max-w-[5.5rem] sm:max-w-none line-clamp-2 sm:line-clamp-none">
              {badge}
            </span>
          )}
          {discount > 0 && (
            <span className="bg-red-50 text-red-700 border border-red-100 text-[8px] sm:text-[10px] uppercase tracking-wider font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded sm:rounded-md shadow-sm">
              -{discount}%
            </span>
          )}
        </div>

        {!inStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-2">
            <span className="bg-gray-900 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium text-center">Out of Stock</span>
          </div>
        )}

        {inStock && (
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden lg:block">
            {hasVariants ? (
              <span className="w-full bg-white text-gray-900 hover:bg-gray-900 hover:text-white py-2.5 sm:py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm">
                <i className="ri-list-check text-sm"></i>
                <span>Select Options</span>
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addToCart({
                    id, name, price, image, quantity: moq, slug, maxStock, moq,
                    retailPrice: price,
                    wholesalePrice: hasWholesale ? Number(wholesalePrice) : null,
                    wholesaleMoq: hasWholesale ? wholesaleThreshold : null,
                  });
                }}
                className="w-full bg-white text-gray-900 hover:bg-gray-900 hover:text-white py-2.5 sm:py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm"
              >
                <i className="ri-shopping-cart-2-line text-sm"></i>
                <span>{moq > 1 ? `Add ${moq} to Cart` : 'Quick Add'}</span>
              </button>
            )}
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-grow min-w-0">
        <Link href={`/product/${slug}`}>
          <h3 className="font-serif text-xs sm:text-sm md:text-lg leading-snug sm:leading-tight text-gray-900 mb-0.5 sm:mb-1 group-hover:text-purple-800 transition-colors line-clamp-2">
            {name}
          </h3>
        </Link>

        {colorVariants.length > 0 && (
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-2 flex-wrap">
            {colorVariants.slice(0, MAX_SWATCHES).map((color) => (
              <button
                key={color.name}
                title={color.name}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveColor(activeColor === color.name ? null : color.name);
                }}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border transition-all duration-200 flex-shrink-0 ${
                  activeColor === color.name
                    ? 'ring-1 ring-offset-1 sm:ring-2 ring-pink-600 scale-110'
                    : 'hover:scale-110'
                } ${color.hex === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {colorVariants.length > MAX_SWATCHES && (
              <span className="text-[10px] sm:text-xs text-gray-400 ml-0.5">+{colorVariants.length - MAX_SWATCHES}</span>
            )}
          </div>
        )}

        <div className="flex items-baseline flex-wrap gap-x-1 sm:gap-x-2 gap-y-0 mb-0.5 sm:mb-1">
          {hasVariants && minVariantPrice ? (
            <span className="text-gray-900 font-semibold text-[11px] sm:text-sm md:text-base leading-tight">From {formatPrice(minVariantPrice)}</span>
          ) : (
            <span className="text-gray-900 font-semibold text-[11px] sm:text-sm md:text-base leading-tight">{formatPrice(price)}</span>
          )}
          {originalPrice && (
            <span className="text-[10px] sm:text-sm text-gray-400 line-through">{formatPrice(originalPrice)}</span>
          )}
        </div>

        {hasWholesale && (
          <div className="mb-1 sm:mb-2 inline-flex items-center gap-0.5 sm:gap-1.5 text-[9px] sm:text-[11px] font-medium text-purple-800 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 sm:rounded-md sm:px-2 self-start max-w-full">
            <i className="ri-stack-line shrink-0 text-[10px] sm:text-xs"></i>
            <span className="line-clamp-2 sm:line-clamp-none leading-tight">Wholesale {formatPrice(Number(wholesalePrice))} at {wholesaleThreshold}+</span>
          </div>
        )}

        <div className="mt-auto pt-1 sm:pt-2 lg:hidden">
          {hasVariants ? (
            <Link
              href={`/product/${slug}`}
              className="w-full border border-gray-200 text-gray-900 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center gap-1"
            >
              <i className="ri-list-check text-xs sm:text-sm"></i>
              <span className="truncate">Options</span>
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart({
                  id, name, price, image, quantity: moq, slug, maxStock, moq,
                  retailPrice: price,
                  wholesalePrice: hasWholesale ? Number(wholesalePrice) : null,
                  wholesaleMoq: hasWholesale ? wholesaleThreshold : null,
                });
              }}
              disabled={!inStock}
              className="w-full border border-gray-200 text-gray-900 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-[11px] sm:text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {moq > 1 ? `Add ${moq}` : 'Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
