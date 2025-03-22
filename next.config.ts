import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

// Create the bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
};

// Export the config wrapped with the bundle analyzer
export default withBundleAnalyzer(nextConfig);