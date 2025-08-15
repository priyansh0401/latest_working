/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['avatar.vercel.sh'],
    unoptimized: true,
  },
  // Ensure CSS is properly processed
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
