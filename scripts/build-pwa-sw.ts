import { readFileSync } from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

const ROOT = process.cwd();

function readPackageVersion(): string {
  try {
    const raw = readFileSync(path.join(ROOT, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7);
  const cacheVersion = commit || readPackageVersion();

  await esbuild.build({
    entryPoints: [path.join(ROOT, "lib/pwa/sw-worker-entry.ts")],
    outfile: path.join(ROOT, "public/sw.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: process.env.NODE_ENV === "production",
    alias: {
      "@": ROOT,
    },
    define: {
      __PWA_CACHE_VERSION__: JSON.stringify(cacheVersion),
    },
    logLevel: "info",
  });

  console.log(`pwa:build-sw — public/sw.js (cache ${cacheVersion})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
