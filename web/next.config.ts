import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ensure path aliases work in both client and server
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
  // Ensure TypeScript path mapping works
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure dynamic routes work properly on Vercel
  trailingSlash: false,
  // Force static generation for better Vercel compatibility
  output: 'standalone',
  // Ensure proper handling of dynamic routes
  experimental: {
    // Enable app directory features
    appDir: true,
  },
};

export default nextConfig;
