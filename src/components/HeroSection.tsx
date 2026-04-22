"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CATEGORY_CHIPS = [
  { emoji: "🎵", label: "Live Music", href: "/events?category=music" },
  { emoji: "🎨", label: "Art Exhibitions", href: "/events?category=arts" },
  { emoji: "🎪", label: "Festivals", href: "/events?category=festival" },
  { emoji: "🍽️", label: "Food & Drink", href: "/events?category=food_drink" },
  { emoji: "⚽", label: "Sports", href: "/events?category=sports" },
];

export function HeroSection() {
  return (
    <section className="relative rounded-none md:rounded-2xl overflow-hidden bg-inverse-surface text-white min-h-[320px] md:min-h-[380px] flex flex-col justify-center md:mx-6 md:mt-6 shadow-md">
      {/* Background image */}
      <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/80 to-transparent z-10" />
      <img
        src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1280&q=80"
        alt="Crowd at an outdoor music festival with colorful stage lights"
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
      />

      {/* Content */}
      <div className="relative z-20 px-8 md:px-12 py-10 max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4"
          style={{ letterSpacing: "-0.02em" }}
        >
          Find your vibe,
          <br />
          join the community.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="font-body text-lg text-surface-variant mb-8 max-w-lg"
        >
          Dive into a curated world of live gigs, art shows, markets, and
          community gatherings happening near you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-wrap gap-3"
        >
          {CATEGORY_CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full font-body text-sm font-semibold text-white border border-white/30 hover:bg-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-inverse-surface"
            >
              <span aria-hidden="true">{chip.emoji}</span> {chip.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
