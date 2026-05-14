'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MiniCart from './MiniCart';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import {
  getContactAddress,
  getContactPhoneDisplay,
  getContactPhoneTel,
  getWordmark,
  sanitizeAddressDisplay,
} from '@/lib/site-defaults';

type HeaderCategory = {
  name: string;
  slug?: string;
};

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || (process.env.NEXT_PUBLIC_SITE_NAME || 'Accra Wholesale Clothing');
  const wordmark = getWordmark();
  const phoneDisplay = getContactPhoneDisplay() || '024 007 1522';
  const phoneHref = getContactPhoneTel() || '+233240071522';
  const address = sanitizeAddressDisplay(getContactAddress()) || 'CMB & Ablekuma Olebu, Accra';
  const categoryLinks = categories.length > 0
    ? categories.slice(0, 5)
    : [
      { name: 'Female Clothing', slug: 'female-clothing' },
      { name: 'Mannequins', slug: 'mannequins' },
      { name: 'Wholesale', slug: 'wholesale' },
    ];

  const primaryLinks = [
    { label: 'Shop', href: '/shop', eyebrow: 'All products' },
    { label: 'Categories', href: '/categories', eyebrow: 'Browse' },
    { label: 'About', href: '/about', eyebrow: 'Our story' },
    { label: 'Contact', href: '/contact', eyebrow: 'Get in touch' },
  ];

  const supportLinks = [
    { label: 'Track Order', href: '/order-tracking', icon: 'ri-map-pin-time-line' },
    { label: 'Pickup & Delivery', href: '/shipping', icon: 'ri-truck-line' },
    { label: 'Contact', href: '/contact', icon: 'ri-customer-service-2-line' },
  ];

  const isActive = (href: string) => {
    const path = href.split('?')[0];
    if (path === '/') return pathname === '/';
    return pathname === path;
  };

  useEffect(() => {
    // Wishlist logic
    const updateWishlistCount = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlistCount(wishlist.length);
    };

    updateWishlistCount();
    window.addEventListener('wishlistUpdated', updateWishlistCount);

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Auth logic
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('name, slug')
        .eq('status', 'active')
        .order('position', { ascending: true })
        .limit(5);

      if (data) setCategories(data);
    };

    fetchCategories();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('wishlistUpdated', updateWishlistCount);
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur-xl transition-all duration-300 ${isScrolled ? 'shadow-lg shadow-purple-950/5 border-b border-pink-100' : 'border-b border-gray-100'}`}>
        <div className="safe-area-top" />

        <div className="hidden lg:block bg-gradient-to-r from-purple-950 via-purple-900 to-pink-700 text-white">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 h-10 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-2 font-semibold tracking-wide">
                <i className="ri-vip-crown-line text-pink-200"></i>
                Wholesale & Retail Fashion Supply
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span className="inline-flex items-center gap-2 text-white/85">
                <i className="ri-map-pin-2-line text-pink-200"></i>
                Pickup: {address}
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/shipping" className="hover:text-pink-100 transition-colors">Pickup or Delivery</Link>
              <Link href="/order-tracking" className="hover:text-pink-100 transition-colors">Track Order</Link>
              <a href={`tel:${phoneHref}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-white/20 transition-colors">
                <i className="ri-phone-line"></i>
                {phoneDisplay}
              </a>
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation" className="relative">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-20 lg:h-24 grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:gap-8">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                <button
                  className="lg:hidden h-11 w-11 rounded-full border border-gray-200 text-gray-900 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <i className="ri-menu-2-line text-2xl"></i>
                </button>

                <Link
                  href="/"
                  className="group hidden lg:flex items-center gap-3 min-w-0"
                  aria-label={`${wordmark} — home`}
                >
                  <img
                    src="/logo.png"
                    alt={wordmark}
                    className="h-14 lg:h-16 w-auto object-contain"
                  />
                  <span className="sr-only">{siteName}</span>
                </Link>
              </div>

              <div className="hidden lg:flex items-center justify-center min-w-0">
                <div className="flex items-center justify-center gap-1">
                  {primaryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group relative rounded-full px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.14em] transition-all ${isActive(link.href)
                        ? 'bg-purple-950 text-white shadow-md shadow-purple-950/15'
                        : 'text-gray-800 hover:bg-pink-50 hover:text-pink-700'
                        }`}
                    >
                      <span>{link.label}</span>
                      <span className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-purple-950 px-3 py-1.5 text-[11px] normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${isActive(link.href) ? 'hidden' : ''}`}>
                        {link.eyebrow}
                      </span>
                    </Link>
                  ))}
                </div>

              </div>

              <div className="flex items-center justify-end gap-1 sm:gap-2">
                <button
                  className="lg:hidden h-11 w-11 rounded-full border border-gray-200 text-gray-900 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Search"
                >
                  <i className="ri-search-line text-xl"></i>
                </button>

                <form onSubmit={handleSearch} className="hidden lg:block w-52 xl:w-56 transition-all duration-300 focus-within:w-72 xl:focus-within:w-80">
                  <label className="relative block">
                    <span className="sr-only">Search products</span>
                    <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-11 pr-20 text-sm outline-none transition-all focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-pink-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-900 transition-colors"
                    >
                      Search
                    </button>
                  </label>
                </form>

                <Link
                  href="/wishlist"
                  className="relative hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-900 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                  aria-label="Wishlist"
                >
                  <i className="ri-heart-line text-xl"></i>
                  {wishlistCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  href={user ? '/account' : '/auth/login'}
                  className="hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-900 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                  aria-label={user ? 'Account' : 'Login'}
                >
                  <i className="ri-user-line text-xl"></i>
                </Link>

                <div className="relative">
                  <button
                    className="relative flex h-11 w-11 items-center justify-center rounded-full bg-purple-950 text-white shadow-md shadow-purple-950/15 hover:bg-pink-700 transition-colors"
                    onClick={() => setIsCartOpen(!isCartOpen)}
                    aria-label="Cart"
                  >
                    <i className="ri-shopping-bag-3-line text-xl"></i>
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </nav>
      </header>

      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {isSearchOpen && (
        <div className="fixed inset-0 bg-purple-950/70 z-[90] flex items-start justify-center pt-24 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-950 to-pink-700 p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-pink-100 font-bold">Product Finder</p>
                  <h3 className="text-2xl font-serif">Search Accra Wholesale</h3>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  aria-label="Close search"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dresses, mannequins, wholesale stock..."
                    className="w-full px-5 py-4 pr-14 rounded-2xl border-0 bg-white text-gray-900 shadow-lg focus:ring-4 focus:ring-pink-200 text-base"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-pink-700 text-white hover:bg-purple-900 transition-colors"
                    aria-label="Submit search"
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
              </form>
            </div>

            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400 mb-3">Quick searches</p>
              <div className="flex flex-wrap gap-2">
                {['Dresses', 'Mannequins', 'Wholesale', 'New Arrivals', 'Best Sellers'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchQuery(term);
                      window.location.href = `/shop?search=${encodeURIComponent(term)}`;
                    }}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-purple-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 bottom-0 w-[90%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 overflow-hidden">
            <div className="relative bg-gradient-to-br from-purple-950 via-purple-900 to-pink-700 p-5 text-white">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#f472b6,_transparent_35%)]" />
              <div className="relative flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                aria-label={`${wordmark} — home`}
              >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg">
                    <img
                      src="/logo.png"
                      alt={wordmark}
                      className="h-11 w-auto object-contain"
                    />
                  </span>
                  <span>
                    <span className="block font-serif text-lg leading-tight">{siteName}</span>
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-pink-100 font-bold">Wholesale Fashion Hub</span>
                  </span>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                  className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
              </div>

              <form onSubmit={handleSearch} className="relative mt-5">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-2xl border-0 bg-white px-4 py-3 pr-12 text-sm text-gray-900 shadow-lg focus:ring-4 focus:ring-pink-200"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-pink-700 text-white"
                  aria-label="Search"
                >
                  <i className="ri-search-line"></i>
                </button>
              </form>
            </div>

            <nav className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Shop</p>
                <div className="grid grid-cols-2 gap-3">
                  {primaryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-2xl border border-gray-200 p-4 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="block text-sm font-bold text-gray-900">{link.label}</span>
                      <span className="block text-xs text-gray-500 mt-1">{link.eyebrow}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Popular categories</p>
                <div className="space-y-2">
                  {categoryLinks.map((category) => (
                    <Link
                      key={category.slug || category.name}
                      href={`/shop?category=${encodeURIComponent(category.slug || category.name.toLowerCase())}`}
                      className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.name}
                      <i className="ri-arrow-right-up-line text-gray-400"></i>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Support</p>
                <div className="space-y-2">
                  {[...supportLinks, { label: 'Wishlist', href: '/wishlist', icon: 'ri-heart-line' }, { label: 'My Account', href: user ? '/account' : '/auth/login', icon: 'ri-user-line' }].map((link) => (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-pink-700 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-pink-700">
                        <i className={link.icon}></i>
                      </span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <a
                href={`tel:${phoneHref}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-purple-950 px-4 py-3 text-sm font-bold text-white shadow-md"
              >
                <i className="ri-phone-line"></i>
                Call / WhatsApp: {phoneDisplay}
              </a>
              <p className="mt-3 text-center text-[11px] text-gray-500">
                Pickup at {address}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}