/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_URL: 'https://itcrmbackend.vercel.app'
  }
};

module.exports = nextConfig;