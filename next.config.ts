import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection (stray lockfile in parent dirs)
  outputFileTracingRoot: path.resolve(__dirname),

  // Enable image optimisation for event images from external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
