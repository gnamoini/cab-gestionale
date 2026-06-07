import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import bundleAnalyzer from "@next/bundle-analyzer";
import { getHttpSecurityHeaders } from "./lib/security/http-security-headers";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** Evita root inference errata (HMR loop / segment-config churn su Windows). */
  turbopack: {
    root: projectRoot,
  },
  images: {
    qualities: [75, 100],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getHttpSecurityHeaders(),
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
