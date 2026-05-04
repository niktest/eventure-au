"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";

/**
 * Hero band per EVE-126 §5. Dark surface with neon-dusk gradient.
 * h1 wording is preserved verbatim ("Find your vibe, join the community.")
 * to avoid SEO regression.
 */
export function HeroSection({ children }: { children?: React.ReactNode }) {
  return (
    <section
      aria-label="Discover events"
      className="hero-seam-bleed relative overflow-hidden text-on-dark-strong"
      style={{ background: "var(--gradient-neon-dusk)" }}
    >
      <img
        src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1280&q=80"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay pointer-events-none"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-8">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            Find your vibe,
            <br />
            join the community.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="font-body text-lg text-on-dark-muted max-w-lg"
          >
            Live music, festivals, markets, sport — discover what&apos;s
            happening near you tonight.
          </motion.p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <form
            role="search"
            action="/events"
            method="get"
            className="flex-1 flex items-center gap-2 rounded-full bg-surface-1 border border-surface-3 px-4 h-12 focus-within:border-neon-coral focus-within:ring-2 focus-within:ring-neon-coral-glow transition-colors"
          >
            <Search size={18} aria-hidden="true" className="text-on-dark-muted shrink-0" />
            <label htmlFor="hero-search" className="sr-only">
              Search events
            </label>
            <input
              id="hero-search"
              type="search"
              name="q"
              placeholder="Search events…"
              className="flex-1 bg-transparent outline-none text-on-dark-strong placeholder:text-on-dark-subtle font-body"
            />
            <button
              type="submit"
              className="rounded-full bg-neon-coral text-[#0B0D12] px-4 h-9 font-body text-sm font-semibold hover:bg-[#E84A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow"
            >
              Go
            </button>
          </form>
          {children}
        </div>
      </div>
    </section>
  );
}
