import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection (stray lockfile in parent dirs)
  outputFileTracingRoot: path.resolve(__dirname),

  // Vercel's image optimiser exhausts its Hobby-tier quota mid-month and starts
  // returning 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED for every `/_next/image`
  // request, leaving every event card empty even when `imageUrl` is set correctly
  // in the database. Bypass the optimiser entirely so `<Image>` emits the upstream
  // URL directly. The upgrade* helpers in scrape-helpers.ts already produce
  // appropriately sized assets at ingest time.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
