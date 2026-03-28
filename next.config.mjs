/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'contents.kyobobook.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'sryqiljtqfplyzebnlgh.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'i.namu.wiki',
      },
      {
        protocol: 'https',
        hostname: 'shopping-phinf.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: 'image.aladin.co.kr',
      },
    ],
  },
};
export default nextConfig;
