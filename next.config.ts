import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // For production deployment with nginx
  serverExternalPackages: ['@simplewebauthn/server'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Handle deployment behind proxy
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  // Configure for custom domains
  async rewrites() {
    return [
      // Handle socket.io
      {
        source: '/api/socket/io/:path*',
        destination: '/api/socket/io/:path*',
      },
    ];
  },
};

export default nextConfig;
