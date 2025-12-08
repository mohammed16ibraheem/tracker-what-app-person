import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow local network origin for dev access (mobile on same WiFi)
  // This fixes WebSocket HMR connection errors and cross-origin warnings
  // Note: This only affects development mode, not production builds
  allowedDevOrigins: [
    "192.168.0.7",
    "192.168.0.7:3000",
    "localhost",
    "localhost:3000",
  ],
  // Note: Don't use 'output: standalone' for Vercel - Vercel handles deployment automatically
};

export default nextConfig;
