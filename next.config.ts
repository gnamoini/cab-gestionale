import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import bundleAnalyzer from "@next/bundle-analyzer";

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
};

export default withBundleAnalyzer(nextConfig);
