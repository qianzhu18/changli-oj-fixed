/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    // 在生产构建时忽略TypeScript错误
    ignoreBuildErrors: false,
  },
  eslint: {
    // 在生产构建时忽略ESLint错误
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
