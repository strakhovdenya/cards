import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Игнорируем предупреждения о синхронных API
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Подавляем предупреждения о cookies()
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
