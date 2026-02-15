import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Required for sharp and pdfkit native modules
  serverExternalPackages: ['sharp', 'pdfkit'],
};

export default nextConfig;
