import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/soundboard',
  distDir: '../dist/web',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
