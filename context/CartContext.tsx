'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolveTier } from '@/lib/pricing';

export type CartItem = {
    id: string;
    name: string;
    /**
     * Effective per-unit price for the current quantity (retail or wholesale).
     * Kept in sync automatically by addToCart / updateQuantity.
     * Existing callers that read `item.price` keep working.
     */
    price: number;
    image: string;
    quantity: number;
    variant?: string;
    slug: string;
    maxStock: number;
    moq?: number; // Minimum Order Quantity
    /** Frozen retail unit price at add-to-cart time. */
    retailPrice?: number;
    /** Optional wholesale tier — when set, kicks in at wholesaleMoq+ units. */
    wholesalePrice?: number | null;
    /** Quantity threshold that unlocks wholesalePrice. */
    wholesaleMoq?: number | null;
};

/**
 * Recompute `price` based on `quantity` so cart lines auto-switch
 * to the wholesale tier when the customer crosses the MOQ threshold.
 */
function repriceItem(item: CartItem): CartItem {
    const retail = item.retailPrice ?? item.price;
    const resolved = resolveTier(
        {
            price: retail,
            wholesale_price: item.wholesalePrice ?? null,
            wholesale_moq: item.wholesaleMoq ?? null,
        },
        item.quantity,
    );
    return { ...item, price: resolved.unitPrice, retailPrice: retail };
}

type CartContextType = {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string, variant?: string) => void;
    updateQuantity: (itemId: string, quantity: number, variant?: string) => void;
    clearCart: () => void;
    cartCount: number;
    subtotal: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from localStorage on mount, with migration for legacy items
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                const parsed: CartItem[] = JSON.parse(savedCart);
                // Migrate legacy cart items: if `id` is not a UUID, it's likely a slug
                const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const migratedCart = parsed.filter(item => {
                    if (!item.id || !item.name || !item.price) return false; // Remove corrupted items
                    if (!isValidUUID(item.id)) {
                        // Legacy item with slug as id - ensure slug is set, then clear
                        // These items will be resolved at checkout via the slug fallback
                        // But best to remove them so users re-add with correct UUIDs
                        console.warn(`Removing legacy cart item with non-UUID id: ${item.id}`);
                        return false;
                    }
                    // Ensure slug field exists
                    if (!item.slug) {
                        item.slug = item.id;
                    }
                    return true;
                });
                // Reprice legacy items so wholesale tier kicks in even if the
                // stored price was frozen at retail.
                setCart(migratedCart.map(repriceItem));
                // If items were removed, update localStorage immediately
                if (migratedCart.length !== parsed.length) {
                    localStorage.setItem('cart', JSON.stringify(migratedCart));
                }
            } catch (e) {
                console.error('Failed to parse cart:', e);
                localStorage.removeItem('cart');
            }
        }
        setIsInitialized(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('cart', JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated')); // Keep compatibility with legacy listeners if any
        }
    }, [cart, isInitialized]);

    const addToCart = (newItem: CartItem) => {
        setCart((prevCart) => {
            const existingItemIndex = prevCart.findIndex(
                (item) => item.id === newItem.id && item.variant === newItem.variant
            );

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                const existingItem = newCart[existingItemIndex];
                // Ensure we don't exceed max stock
                const newQuantity = Math.min(
                    existingItem.quantity + newItem.quantity,
                    existingItem.maxStock
                );
                // Merge any newly-supplied wholesale fields (in case the line was
                // added before product data carried them).
                const merged: CartItem = {
                    ...existingItem,
                    quantity: newQuantity,
                    retailPrice: existingItem.retailPrice ?? newItem.retailPrice ?? newItem.price,
                    wholesalePrice:
                        existingItem.wholesalePrice ?? newItem.wholesalePrice ?? null,
                    wholesaleMoq: existingItem.wholesaleMoq ?? newItem.wholesaleMoq ?? null,
                };
                newCart[existingItemIndex] = repriceItem(merged);
                return newCart;
            } else {
                const seeded: CartItem = {
                    ...newItem,
                    retailPrice: newItem.retailPrice ?? newItem.price,
                };
                return [...prevCart, repriceItem(seeded)];
            }
        });

        setIsCartOpen(true); // Open cart when item is added
    };

    const removeFromCart = (itemId: string, variant?: string) => {
        setCart((prevCart) =>
            prevCart.filter((item) => !(item.id === itemId && item.variant === variant))
        );
    };

    const updateQuantity = (itemId: string, quantity: number, variant?: string) => {
        setCart((prevCart) => {
            const item = prevCart.find(i => i.id === itemId && i.variant === variant);
            if (!item) return prevCart;

            const minQty = item.moq || 1;

            // If trying to reduce below MOQ, remove the item
            if (quantity < minQty) {
                return prevCart.filter(i => !(i.id === itemId && i.variant === variant));
            }

            // Clamp quantity between MOQ and maxStock
            const clampedQty = Math.min(Math.max(quantity, minQty), item.maxStock);

            return prevCart.map((i) =>
                i.id === itemId && i.variant === variant
                    ? repriceItem({ ...i, quantity: clampedQty })
                    : i
            );
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount,
            subtotal,
            isCartOpen,
            setIsCartOpen
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
