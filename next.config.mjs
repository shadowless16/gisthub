/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove this env block as JWT_SECRET is server-side only
  // env: {
  //   JWT_SECRET: process.env.JWT_SECRET,
  // },
}

export default nextConfig