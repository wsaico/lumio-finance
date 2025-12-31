import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Required for sharp and pdfkit native modules
  serverExternalPackages: ['sharp', 'pdfkit'],
};

export default nextConfig;
