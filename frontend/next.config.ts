import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버를 하나 더 띄울 때(예: 테스트용) 빌드 폴더를 분리하기 위한 옵션
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
