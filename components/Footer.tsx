"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useCMS } from '@/context/CMSContext';
import {
  getSiteName,
  getSiteTagline,
  getWordmark,
  getContactEmail,
  getContactPhoneDisplay,
  getContactAddress,
  sanitizeAddressDisplay,
  getDefaultSocialLinks,
} from '@/lib/site-defaults';

function FooterSection({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-purple-800/40 md:border-none last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left md:py-0 md:cursor-default md:mb-3"
        aria-expanded={isOpen}
      >
        <h4 className="font-serif text-base md:text-lg font-bold text-white">{title}</h4>
        <i className={`ri-arrow-down-s-line text-pink-400 text-xl transition-transform duration-300 md:hidden ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0 md:max-h-full md:overflow-visible'}`}>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || getSiteName();
  const siteTagline = getSetting('site_tagline') || getSiteTagline();
  const contactEmail = getSetting('contact_email') || getContactEmail();
  const contactPhone = getSetting('contact_phone') || getContactPhoneDisplay();
  const contactWhatsapp = getSetting('contact_whatsapp') || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || getContactPhoneDisplay();
  const contactAddress = sanitizeAddressDisplay(
    getSetting('contact_address') || getContactAddress()
  );
  const wordmark = getSetting('wordmark') || getWordmark();
  const socialDefaults = getDefaultSocialLinks();
  const socialFacebook = getSetting('social_facebook') || socialDefaults.facebook;
  const socialInstagram = getSetting('social_instagram') || socialDefaults.instagram;
  const socialTwitter = getSetting('social_twitter') || socialDefaults.twitter;
  const socialTiktok = getSetting('social_tiktok') || socialDefaults.tiktok;
  const socialSnapchat = getSetting('social_snapchat') || socialDefaults.snapchat;
  const socialYoutube = getSetting('social_youtube') || socialDefaults.youtube;

  return (
    <footer className="relative mt-8 z-0">

      {/* Footer Background Shape */}
      <div className="absolute inset-0 bg-purple-950 rounded-t-[3rem] -z-10 overflow-hidden">
        {/* Decorative elements inside footer bg */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-800 to-transparent opacity-30"></div>
      </div>

      <div className="text-white pt-10 pb-6 sm:pt-14 sm:pb-10 lg:pt-20 lg:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-10">

            {/* Brand Column */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4">
              <Link
                href="/"
                className="inline-block group"
                aria-label={`${wordmark} — home`}
              >
                <img
                  src="/logo.png"
                  alt={wordmark}
                  className="h-12 sm:h-14 lg:h-16 w-auto object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300 origin-left"
                />
                <span className="sr-only">{wordmark}</span>
              </Link>
              <p className="text-pink-200/60 leading-relaxed text-xs sm:text-sm line-clamp-3 sm:line-clamp-none">
                {[siteTagline, contactAddress || null, contactPhone ? `Tel: ${contactPhone}` : null, (contactWhatsapp && contactWhatsapp !== contactPhone) ? `WhatsApp: ${contactWhatsapp}` : null].filter(Boolean).join(' · ') || `${siteTagline}.`}
              </p>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  { link: socialInstagram, icon: 'ri-instagram-line', label: 'Instagram' },
                  { link: socialYoutube, icon: 'ri-youtube-fill', label: 'YouTube' },
                  { link: socialSnapchat, icon: 'ri-snapchat-fill', label: 'Snapchat' },
                  { link: socialTiktok, icon: 'ri-tiktok-fill', label: 'TikTok' },
                  { link: socialTwitter, icon: 'ri-twitter-x-fill', label: 'X' },
                  { link: socialFacebook, icon: 'ri-facebook-fill', label: 'Facebook' }
                ].map((social, i) => social.link && (
                  <a
                    key={i}
                    href={social.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-900/40 border border-purple-800 rounded-full flex items-center justify-center text-pink-300 text-sm sm:text-base hover:bg-pink-500 hover:text-purple-950 hover:border-pink-500 transition-all hover:-translate-y-1"
                  >
                    <i className={social.icon}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* Links Sections — accordion on mobile, 3-col grid from md+ */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 lg:gap-10 mt-2 lg:mt-0 lg:pl-12">

              <FooterSection title="Shop">
                <ul className="space-y-2 text-pink-100/60 text-sm">
                  <li><Link href="/shop" className="hover:text-pink-300 transition-colors">All Products</Link></li>
                  <li><Link href="/categories" className="hover:text-pink-300 transition-colors">Collections</Link></li>
                  <li><Link href="/shop?sort=newest" className="hover:text-pink-300 transition-colors">New Arrivals</Link></li>
                  <li><Link href="/shop?sort=bestsellers" className="hover:text-pink-300 transition-colors">Best Sellers</Link></li>
                </ul>
              </FooterSection>

              <FooterSection title="Support">
                <ul className="space-y-2 text-pink-100/60 text-sm">
                  <li><Link href="/contact" className="hover:text-pink-300 transition-colors">Contact Us</Link></li>
                  <li><Link href="/order-tracking" className="hover:text-pink-300 transition-colors">Track Order</Link></li>
                  <li><Link href="/shipping" className="hover:text-pink-300 transition-colors">Shipping & Delivery</Link></li>
                  <li><Link href="/returns" className="hover:text-pink-300 transition-colors">Returns & Exchange</Link></li>
                </ul>
              </FooterSection>

              <FooterSection title="Company">
                <ul className="space-y-2 text-pink-100/60 text-sm">
                  <li><Link href="/about" className="hover:text-pink-300 transition-colors">Our Story</Link></li>
                  <li><Link href="/privacy" className="hover:text-pink-300 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-pink-300 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/admin" className="hover:text-pink-300 transition-colors">Admin Access</Link></li>
                </ul>
              </FooterSection>

            </div>
          </div>

          <div className="border-t border-purple-900/50 mt-6 pt-5 sm:mt-10 sm:pt-8 lg:mt-14 lg:pt-12 flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-pink-500/40">
            <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            <div className="flex gap-2 sm:gap-3 opacity-40">
              <i className="ri-visa-line text-lg sm:text-xl"></i>
              <i className="ri-mastercard-line text-lg sm:text-xl"></i>
              <i className="ri-paypal-line text-lg sm:text-xl"></i>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
