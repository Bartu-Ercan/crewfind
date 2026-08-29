import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.2.106"],
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "crewfind-tr.vercel.app" }],
      destination: "https://crewfind.vercel.app/:path*",
      permanent: true,
    }];
  },
};

export default nextConfig;
