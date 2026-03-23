import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/soundboard',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
