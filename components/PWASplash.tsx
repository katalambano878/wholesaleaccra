'use client';

import { useState, useEffect } from 'react';

export default function PWASplash() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only show splash in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Only show on first load (not on subsequent navigations)
    const hasShownSplash = sessionStorage.getItem('splashShown');

    if (isStandalone && !hasShownSplash) {
      setShowSplash(true);
      sessionStorage.setItem('splashShown', 'true');

      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div className="pwa-splash" aria-hidden="true">
      <div className="pwa-splash-logo mb-4">
        <img
          src="/logo.png"
          alt={process.env.NEXT_PUBLIC_WORDMARK || 'Accra Wholesale Clothing'}
          className="h-28 sm:h-32 w-auto object-contain drop-shadow-lg"
        />
      </div>
      <h1 className="text-white text-lg font-medium font-sans mb-2 opacity-90">{process.env.NEXT_PUBLIC_SITE_NAME || 'Accra Wholesale Clothing'}</h1>
      <p className="text-pink-200 text-sm font-medium mb-8">Quality Products & Supplies</p>
      <div className="pwa-splash-dots flex gap-1.5">
        <span className="w-2 h-2 bg-white rounded-full" />
        <span className="w-2 h-2 bg-white rounded-full" />
        <span className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  );
}
