import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    // Ensure path aliases work in both client and server
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Add fallback for path resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      path: false,
    };
    
    return config;
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
