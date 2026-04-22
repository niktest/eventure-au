"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const FLOATING_SHAPES = [
  { size: 6, left: "10%", delay: 0, duration: 8, color: "rgba(255,185,48,0.3)" },
  { size: 4, left: "25%", delay: 2, duration: 10, color: "rgba(255,107,74,0.25)" },
  { size: 8, left: "45%", delay: 1, duration: 7, color: "rgba(255,255,255,0.15)" },
  { size: 5, left: "65%", delay: 3, duration: 9, color: "rgba(255,185,48,0.2)" },
  { size: 3, left: "80%", delay: 0.5, duration: 11, color: "rgba(255,255,255,0.2)" },
  { size: 7, left: "90%", delay: 4, duration: 8, color: "rgba(255,107,74,0.2)" },
];

export function HeroSection() {
  return (
    <section className="hero-gradient wave-divider relative overflow-hidden px-4 pb-24 pt-16 md:pb-32 md:pt-24">
      {/* Floating particles */}
      {FLOATING_SHAPES.map((shape, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            left: shape.left,
            bottom: "10%",
            backgroundColor: shape.color,
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`,
          }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            Gold Coast &bull; Brisbane &bull; Australia-wide
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="mb-6 font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          Discover amazing events
          <br />
          <span className="text-sunshine">near you</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl"
        >
          Live music, festivals, markets, sports, nightlife, and more — all in
          one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href="/events"
            className="btn-glow inline-block rounded-lg bg-white px-8 py-3.5 font-semibold text-coral shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Browse all events
          </Link>
          <Link
            href="/city/gold-coast"
            className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 font-semibold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
          >
            Explore Gold Coast
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
