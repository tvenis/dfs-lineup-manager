import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal configuration for CI compatibility
  experimental: {
    // Disable experimental features that might cause issues
  },
  // Ensure TypeScript path mapping works
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
