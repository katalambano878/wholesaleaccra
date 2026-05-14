"use client";

import { useState } from 'react';

// Newsletter Component
export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setEmail('');
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mb-8">
      <div className="bg-[#1a0b2e] rounded-3xl overflow-hidden shadow-2xl relative">

        {/* Background Image / Texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-pink-500 rounded-full blur-[100px] opacity-30"></div>
          <div className="absolute top-32 -left-16 w-56 h-56 bg-pink-400 rounded-full blur-[100px] opacity-20"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-5 md:p-7 lg:p-8 gap-5">

          {/* Left Content */}
          <div className="text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-900/50 border border-pink-500/30 text-pink-300 text-[11px] font-bold tracking-widest uppercase mb-3 animate-pulse-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
              The Insider Club
            </div>

            <h3 className="text-xl md:text-2xl font-serif text-white mb-2 leading-tight">
              Unlock <span className="italic text-pink-400">10% Off</span> Your First Order
            </h3>

            <p className="text-pink-100/80 text-sm leading-relaxed">
              Be the first to know about new arrivals, restocks, and exclusive wholesale offers — straight to your inbox.
            </p>
          </div>

          {/* Right Form */}
          <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 pwa-submit-form">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 bg-transparent border-none text-white placeholder-white/40 px-4 py-2.5 focus:ring-0 text-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed shadow-lg whitespace-nowrap text-sm"
              >
                {isSubmitting ? (
                  <i className="ri-loader-4-line animate-spin text-base"></i>
                ) : (
                  <span className="flex items-center gap-2">
                    Join <i className="ri-arrow-right-line"></i>
                  </span>
                )}
              </button>
            </form>
          </div>

        </div>

        {submitStatus === 'success' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <i className="ri-checkbox-circle-line mr-2"></i> Welcome to the club!
          </div>
        )}
      </div>
    </div>
  );
}
