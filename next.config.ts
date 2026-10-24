import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Cache Components is off: almost every screen reads the signed-in user's
  // cookies, so pages render per request. See docs/ARCHITECTURE.md.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
