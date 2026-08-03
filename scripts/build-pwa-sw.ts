import path from "node:path";
import esbuild from "esbuild";

const ROOT = process.cwd();

function resolveCacheVersion(): string {
  const supplied =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.PWA_BUILD_VERSION?.trim() ||
    process.env.GIT_COMMIT_SHA?.trim();
  const productionBuild =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV?.trim());

  if (productionBuild && !supplied) {
    throw new Error(
      "pwa:build-sw — production builds require VERCEL_GIT_COMMIT_SHA, GIT_COMMIT_SHA, or PWA_BUILD_VERSION",
    );
  }

  return supplied?.slice(0, 40) || `local-${Date.now().toString(36)}`;
}

async function main(): Promise<void> {
  const cacheVersion = resolveCacheVersion();

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
