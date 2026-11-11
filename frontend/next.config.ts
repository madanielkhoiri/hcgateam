import type { NextConfig } from "next";

const cacheLama = [
  { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "three", "@react-three/drei"],
  },
  async headers() {
    return [
      { source: "/logos/:path*", headers: cacheLama },
      { source: "/models/:path*", headers: cacheLama },
      { source: "/login-characters/:path*", headers: cacheLama },
    ];
  },
};

export default nextConfig;
