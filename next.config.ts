import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Photo Finder API reads these JSON files at runtime; make sure Vercel bundles them with the functions.
  outputFileTracingIncludes: {
    "/api/photo-finder/*": ["./data/mvp/library.json", "./data/mvp/tasks.json"],
  },
};

export default nextConfig;
