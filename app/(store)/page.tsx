'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ProductCard, { type ColorVariant, getColorHex } from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import AnimatedSection, { AnimatedGrid } from '@/components/AnimatedSection';
import NewsletterSection from '@/components/NewsletterSection';
import { usePageTitle } from '@/hooks/usePageTitle';

const HOME_CATEGORY_TINTS = ['bg-purple-900', 'bg-rose-900', 'bg-amber-900', 'bg-stone-900', 'bg-emerald-900', 'bg-violet-900', 'bg-orange-900', 'bg-slate-900'];

export default function Home() {
  usePageTitle('');
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  /** Top-level categories for homepage grid — from Supabase (Admin: Featured + image) */
  const [homeCategories, setHomeCategories] = useState<
    { id: string; name: string; display_name: string; slug: string; subtitle: string; image: string; tint: string }[]
  >([]);

  const [loading, setLoading] = useState(true);

  // Config State - Managed in Code
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const config: {
    hero: {
      headline: string;
      subheadline: string;
      primaryButtonText: string;
      primaryButtonLink: string;
      secondaryButtonText: string;
      secondaryButtonLink: string;
      backgroundImage?: string;
    };
    banners?: Array<{ text: string; active: boolean }>;
  } = {
    hero: {
      headline: `${process.env.NEXT_PUBLIC_SITE_NAME || 'Accra Wholesale Clothing'} — ${process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Female Clothing & Mannequins'}`,
      subheadline: 'Female fashion and mannequins. Wholesale and retail — pickup at CMB or Ablekuma Olebu, or delivered nationwide.',
      primaryButtonText: 'Shop Now',
      primaryButtonLink: '/shop',
      secondaryButtonText: 'Our Story',
      secondaryButtonLink: '/about',
    },
    banners: [
      { text: '🚚 Pickup at CMB or Ablekuma Olebu · Nationwide delivery', active: false },
      { text: '👗 New arrivals every week — wholesale & retail prices', active: false },
      { text: '💳 Pay with Mobile Money or Card', active: false }
    ]
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, product_variants(*), product_images(*)')
          .eq('status', 'active')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (productsError) throw productsError;
        setFeaturedProducts(productsData || []);

        const { data: catRows, error: catErr } = await supabase
          .from('categories')
          .select('id, name, slug, description, image_url, parent_id, position, metadata')
          .eq('status', 'active')
          .is('parent_id', null)
          .order('position', { ascending: true });

        if (!catErr && catRows?.length) {
          const featured = catRows.filter(
            (c) => c.metadata?.featured === true && c.image_url
          );
          const withImage = catRows.filter((c) => c.image_url);
          const source = featured.length > 0 ? featured : withImage;
          setHomeCategories(
            source.slice(0, 8).map((c, i) => ({
              id: c.id,
              name: c.name,
              display_name: (c.metadata as { display_name?: string })?.display_name || c.name,
              slug: c.slug,
              subtitle:
                (c.description || '').trim().slice(0, 120) ||
                (c.metadata as { subtitle?: string })?.subtitle ||
                'Shop this collection',
              image: c.image_url as string,
              tint: HOME_CATEGORY_TINTS[i % HOME_CATEGORY_TINTS.length],
            }))
          );
        } else {
          setHomeCategories([]);
        }
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        const msg = err?.message ?? (error instanceof Error ? error.message : String(error));
        const code = err?.code ?? '';
        if (code === 'PGRST205') {
          console.warn('Products table not found. Run Supabase migrations to create the schema.');
        } else {
          console.error('Error fetching data:', msg, code ? `(${code})` : '');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);


  const getHeroImage = () => {
    if (config.hero.backgroundImage) return config.hero.backgroundImage;
    return "/logo.png";
  };

  const renderBanners = () => {
    const activeBanners = config.banners?.filter(b => b.active) || [];
    if (activeBanners.length === 0) return null;

    return (
      <div className="bg-purple-900 text-white py-2 overflow-hidden relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {activeBanners.concat(activeBanners).map((banner, index) => (
            <span key={index} className="mx-8 text-sm font-medium tracking-wide flex items-center">
              {banner.text}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-col items-center justify-between min-h-screen">
      {renderBanners()}

      {/* Hero Section - God Level Design */}
      <section className="relative w-full h-[58vh] min-h-[320px] sm:h-[66vh] md:h-[95vh] overflow-hidden bg-black">

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-white/10">
          <div
            key={currentSlide}
            className="h-full bg-white/80 animate-progress origin-left"
            style={{ animationDuration: '3000ms' }}
          ></div>
        </div>

        {/* Background Slider + Per-Slide Content */}
        {[
          {
            image: '/hero-slide-1.png',
            tag: 'New Arrivals',
            heading: <>Fresh Looks <br /><span className="italic font-light text-emerald-100">For Every Woman</span></>,
            subtext: 'New female styles dropping every week — straight from us in Accra. Wholesale and retail prices on the same page.',
            cta: { text: 'Shop now', href: '/shop' },
            cta2: { text: 'Our story', href: '/about' },
            position: 'object-center'
          },
          {
            image: '/hero-slide-2.png',
            tag: 'Wholesale & Retail',
            heading: <>Resellers <br /><span className="italic font-light text-amber-100">Buy in bulk, save more</span></>,
            subtext: 'One piece for you, or a full bundle for your shop — see both prices on every product and order what fits.',
            cta: { text: 'Browse wholesale', href: '/shop' },
            cta2: { text: 'Categories', href: '/categories' },
            position: 'object-center'
          },
          {
            image: '/hero-slide-3.png',
            tag: 'Mannequins',
            heading: <>Display <br /><span className="italic font-light text-amber-100">like a boutique</span></>,
            subtext: 'Premium mannequins for boutiques, market stalls, and pop-ups — pickup at CMB or Ablekuma Olebu, or delivered to you.',
            cta: { text: 'Shop mannequins', href: '/shop' },
            cta2: { text: 'Contact us', href: '/contact' },
            position: 'object-center'
          },
        ].map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            {/* Background Image with Ken Burns Effect */}
            <div className={`absolute inset-0 ${index === currentSlide ? 'animate-ken-burns' : ''}`}>
              <Image
                src={slide.image}
                alt={`Hero Banner ${index + 1}`}
                fill
                className={`object-cover ${slide.position}`}
                priority={index === 0}
                quality={82}
                sizes="100vw"
              />
            </div>

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            {/* Slide Content */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 sm:px-6 md:px-16 max-w-7xl mx-auto h-full pt-2 pb-6 md:mt-[-20px] md:pb-0 md:pt-0">
              <div className="max-w-4xl flex flex-col items-center">
                <div
                  className={`overflow-hidden transition-all duration-700 delay-100 ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                  <span className="inline-block py-1 px-3 sm:px-4 mb-3 md:mb-6 text-white/90 text-xs sm:text-sm md:text-base tracking-[0.25em] sm:tracking-[0.3em] uppercase font-semibold border border-white/20 rounded-full backdrop-blur-md bg-white/5">
                    {slide.tag}
                  </span>
                </div>

                <div className={`transition-all duration-700 delay-200 ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-2 sm:mb-4 leading-[1.1] drop-shadow-2xl">
                    {slide.heading}
                  </h1>
                </div>

                <div className={`transition-all duration-700 delay-300 ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <p className="text-xs sm:text-base md:text-lg text-gray-200 max-w-2xl mx-auto mb-4 sm:mb-8 font-light leading-relaxed line-clamp-4 sm:line-clamp-none">
                    {slide.subtext}
                  </p>
                </div>

                <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 transition-all duration-700 delay-400 ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <Link
                    href={slide.cta.href}
                    className="group relative px-7 py-3 sm:px-10 sm:py-4 bg-white text-gray-950 rounded-full font-medium text-base sm:text-lg overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:bg-gray-100 hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {slide.cta.text} <i className="ri-arrow-right-line transition-transform group-hover:translate-x-1"></i>
                    </span>
                  </Link>
                  <Link
                    href={slide.cta2.href}
                    className="group px-7 py-3 sm:px-10 sm:py-4 bg-white/10 border border-white/30 text-white rounded-full font-medium text-base sm:text-lg backdrop-blur-md hover:bg-white/20 hover:border-white/50 transition-all hover:scale-105"
                  >
                    {slide.cta2.text}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-5 sm:bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1 transition-all duration-300 ${currentSlide === i ? 'w-12 bg-white' : 'w-6 bg-white/40 hover:bg-white/60'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Decoration */}
        <div className="absolute bottom-10 right-6 md:right-16 z-20 hidden md:block">
          <div className="text-white/40 text-sm font-light tracking-widest vertical-text transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
            ACCRA WHOLESALE · WOMEN'S FASHION
          </div>
        </div>

      </section>

      {homeCategories.length > 0 && (
      <section className="py-10 sm:py-16 md:py-28 lg:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
          <AnimatedSection className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16 gap-4 sm:gap-6">
            <div className="relative">
              <span className="block text-[11px] sm:text-sm font-medium tracking-[0.15em] sm:tracking-[0.2em] text-gray-500 mb-2 sm:mb-3 uppercase">Shop by Style</span>
              <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-[1.1]">
                Shop by <span className="italic text-gray-400">Category</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <p className="hidden md:block text-gray-500 max-w-xs text-right font-light leading-relaxed text-sm lg:text-base">
                Dresses, tops, two-pieces, denim, accessories and mannequins — wholesale and retail.
              </p>
              <Link href="/categories" className="group flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300">
                <i className="ri-arrow-right-line text-lg sm:text-xl transition-transform group-hover:translate-x-1"></i>
              </Link>
            </div>
          </AnimatedSection>

          <AnimatedGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6 md:gap-6 lg:gap-8 items-stretch">
              {homeCategories.map((category) => (
              <Link href={`/shop?category=${encodeURIComponent(category.slug)}`} key={category.id} className="group block h-full w-full">
                <div className="relative aspect-[3/4] overflow-hidden isolate bg-gray-900 shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl md:rounded-3xl">

                  <div className="absolute inset-0 transition-transform duration-[1500ms] ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 767px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized={category.image.startsWith('http')}
                    />
                  </div>

                  {/* Cinematic Grading Overlays */}
                  {/* 1. Base Darkening Gradient (Bottom Up) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-90"></div>

                  {/* 2. Color Tint Overlay (Mix Blend) */}
                  <div className={`absolute inset-0 ${category.tint} mix-blend-overlay opacity-40 transition-opacity duration-700 group-hover:opacity-50`}></div>

                  {/* 3. Top Down Vignette for depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60"></div>

                  {/* Content Container */}
                  <div className="absolute inset-0 p-3 sm:p-6 md:p-8 flex flex-col justify-end z-10">

                    {/* Floating 'Explore' Tag - Reveals on Hover */}
                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 md:top-8 md:right-8 overflow-hidden">
                      <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[8px] sm:text-[10px] font-bold text-white tracking-wider sm:tracking-widest uppercase transform translate-y-[-150%] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        Explore <i className="ri-arrow-right-line text-[10px] sm:text-xs"></i>
                      </span>
                    </div>

                    {/* Category Title */}
                    <div className="overflow-hidden">
                      <h3 className="font-serif text-base leading-tight sm:text-2xl md:text-4xl lg:text-5xl text-white sm:leading-[0.95] md:leading-[0.9] mb-1.5 sm:mb-3 line-clamp-3 sm:line-clamp-none transform transition-transform duration-700 ease-out group-hover:-translate-y-2 drop-shadow-xl">
                        {category.display_name || category.name}
                      </h3>
                    </div>

                    {/* Decorative Line */}
                    <div className="h-[1px] w-8 sm:w-12 bg-white/60 mb-2 sm:mb-4 transition-all duration-700 ease-out group-hover:w-full group-hover:bg-white/90"></div>

                    {/* Subtitle / Description */}
                    <div className="overflow-hidden hidden sm:block">
                      <p className="text-white/80 font-light text-[10px] md:text-xs lg:text-sm tracking-wide sm:tracking-widest uppercase line-clamp-2 md:line-clamp-none transform translate-y-full opacity-0 transition-all duration-700 ease-out group-hover:translate-y-0 group-hover:opacity-100 delay-100">
                        {category.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Premium Border Frame Effect */}
                  <div className="absolute inset-2 sm:inset-4 md:inset-5 border border-white/20 scale-[0.95] opacity-0 transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-20">
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/60"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/60"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/60"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/60"></div>
                  </div>

                </div>
              </Link>
            ))}
          </AnimatedGrid>
        </div>
      </section>
      )}

      {/* Featured Products — 2×2-style grid on mobile (two columns); larger breakpoints add columns */}
      <section className="py-10 sm:py-16 md:py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-900 mb-2 sm:mb-4">Featured Products</h2>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">Top picks from our latest arrivals</p>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6 md:gap-6 lg:gap-8 items-stretch">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <AnimatedGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6 md:gap-6 lg:gap-8 items-stretch">
              {featuredProducts.map((product) => {
                const variants = product.product_variants || [];
                const hasVariants = variants.length > 0;
                const minVariantPrice = hasVariants ? Math.min(...variants.map((v: any) => v.price || product.price)) : undefined;
                const totalVariantStock = hasVariants ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) : 0;
                const effectiveStock = hasVariants ? totalVariantStock : product.quantity;

                // Extract unique colors from option2
                const colorVariants: ColorVariant[] = [];
                const seenColors = new Set<string>();
                for (const v of variants) {
                  const colorName = (v as any).option2;
                  if (colorName && !seenColors.has(colorName.toLowerCase().trim())) {
                    const hex = getColorHex(colorName);
                    if (hex) {
                      seenColors.add(colorName.toLowerCase().trim());
                      colorVariants.push({ name: colorName.trim(), hex });
                    }
                  }
                }

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.compare_at_price}
                    image={product.product_images?.[0]?.url || 'https://via.placeholder.com/400x500'}
                    rating={product.rating_avg || 5}
                    reviewCount={product.review_count || 0}
                    badge={product.featured ? 'Featured' : undefined}
                    inStock={effectiveStock > 0}
                    maxStock={effectiveStock || 50}
                    moq={product.moq || 1}
                    hasVariants={hasVariants}
                    minVariantPrice={minVariantPrice}
                    colorVariants={colorVariants}
                    wholesalePrice={product.wholesale_price ?? null}
                    wholesaleMoq={product.wholesale_moq ?? null}
                  />
                );
              })}
            </AnimatedGrid>
          )}

          <div className="text-center mt-16">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center bg-gray-900 text-white px-10 py-4 rounded-full font-medium hover:bg-purple-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 btn-animate"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter - Homepage Only */}
      <NewsletterSection />

    </main>
  );
}
