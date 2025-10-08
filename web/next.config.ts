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
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dkn.gs',
        port: '',
        pathname: '/sports/images/nfl/players/**',
      },
      {
        protocol: 'https',
        hostname: 'dkn.gs',
        port: '',
        pathname: '/sports/images/**',
      },
    ],
  },
};

export default nextConfig;
