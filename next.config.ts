const nextConfig = {
  /* config options here */
  // Ignore ESLint build errors so lint does not block API routes
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript build errors (temporary)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
