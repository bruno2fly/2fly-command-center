import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/whatsapp/:path*",
        destination: "http://localhost:4000/api/whatsapp/:path*",
      },
    ];
  },
};

export default nextConfig;
