import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable image optimisation for event images from external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
