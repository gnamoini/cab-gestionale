import type { NextConfig } from "next";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import bundleAnalyzer from "@next/bundle-analyzer";
import { getHttpSecurityHeaders } from "./lib/security/http-security-headers";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function readPackageVersion(): string {
  try {
    const raw = readFileSync(path.join(projectRoot, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const appBuildTime = new Date().toISOString();
const appVersion = readPackageVersion();
const appCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7) ?? "";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_APP_BUILD_TIME: appBuildTime,
    NEXT_PUBLIC_APP_COMMIT: appCommit,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV?.trim() ?? "",
    PWA_PUSH_ENABLED: process.env.PWA_PUSH_ENABLED?.trim() ?? "",
  },
  /** Evita root inference errata (HMR loop / segment-config churn su Windows). */
  turbopack: {
    root: projectRoot,
  },
  images: {
    qualities: [75, 100],
  },
  outputFileTracingIncludes: {
    "/api/inventory-labels/**": ["./lib/inventory-labels/render/fonts/**"],
  },
  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "@tanstack/react-virtual",
      "@dnd-kit/core",
      "@dnd-kit/utilities",
      "@floating-ui/react-dom",
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: getHttpSecurityHeaders(),
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/agenda",
        destination: "/agenda",
        permanent: true,
      },
      { source: "/ddt", destination: "/preventivi", permanent: false },
      { source: "/dashboard/security", destination: "/sicurezza", permanent: true },
      {
        source: "/dashboard/security/production-readiness",
        destination: "/sicurezza/production-readiness",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
