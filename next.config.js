/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-side environment variables are available
  env: {
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
  // Output standalone for better production performance
  output: 'standalone',
}

module.exports = nextConfig