"use client";

import { motion } from "framer-motion";
import { EventSearchAutocomplete } from "./EventSearchAutocomplete";

/**
 * Hero band per EVE-126 §5. Dark surface with neon-dusk gradient.
 */
export function HeroSection({ children }: { children?: React.ReactNode }) {
  return (
    <section
      aria-label="Discover events"
      // z-20 promotes the hero into its own stacking context so the
      // autocomplete dropdown — which extends below the hero's bottom edge —
      // paints above the following calendar-strip section (EVE-176).
      className="hero-seam-bleed relative z-20 text-on-dark-strong"
      style={{ background: "var(--gradient-neon-dusk)" }}
    >
      {/* Clip the bg image only, so the autocomplete dropdown can extend past
          the section bottom (EVE-176). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1280&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-8">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            Find what&apos;s on near you.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="font-body text-lg text-on-dark-muted max-w-lg"
          >
            Live music, festivals, markets, sport — one calendar for everything
            happening near you.
          </motion.p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div data-primary-search className="flex-1">
            <EventSearchAutocomplete
              inputId="hero-search"
              placeholder="Search events…"
              wrapperClassName="relative w-full"
              iconClassName="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-dark-muted text-[20px] pointer-events-none"
              inputClassName="w-full h-12 rounded-full bg-surface-1 border border-surface-3 pl-11 pr-4 font-body text-on-dark-strong placeholder:text-on-dark-subtle outline-none focus:border-neon-coral focus:ring-2 focus:ring-neon-coral-glow transition-colors"
              panelClassName="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto text-on-surface"
            />
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
