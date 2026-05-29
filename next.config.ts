import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Evita root inference errata (HMR loop / segment-config churn su Windows). */
  turbopack: {
    root: projectRoot,
  },
  images: {
    qualities: [75, 100],
  },
};

export default nextConfig;
