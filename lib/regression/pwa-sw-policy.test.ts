import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PWA_PRECACHE_URLS } from "@/lib/pwa/sw-cache";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const gitignore = read(".gitignore");
assert.match(gitignore, /public\/sw\.js/, ".gitignore deve escludere public/sw.js");

const proxySource = read("src/middleware/proxy-handler.ts");
const handlerBody = proxySource.slice(proxySource.indexOf("export async function handleProxyRequest"));
const pwaStaticIdx = handlerBody.indexOf("isPwaStaticAsset(pathname)");
const pwaPublicIdx = handlerBody.indexOf("isPwaPublicPath(pathname)");
const supabaseClientIdx = handlerBody.indexOf("createSupabaseMiddlewareClient");
assert.ok(pwaStaticIdx > -1 && pwaStaticIdx < supabaseClientIdx, "bypass PWA static prima di session");
assert.ok(pwaPublicIdx > -1 && pwaPublicIdx < supabaseClientIdx, "bypass PWA public prima di session");
assert.match(proxySource, /\/sw\.js/, "proxy bypass sw.js");
assert.match(proxySource, /OFFLINE_PATH|\/offline/, "proxy bypass offline");

const csp = read("lib/security/http-security-headers.ts");
assert.match(csp, /worker-src 'self'/, "CSP worker-src");

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /source: "\/sw\.js"/, "headers sw.js");
assert.match(nextConfig, /Cache-Control.*no-cache/, "sw.js no-cache");
assert.match(nextConfig, /Service-Worker-Allowed/, "Service-Worker-Allowed");

assert.ok(
  !(PWA_PRECACHE_URLS as readonly string[]).some(
    (url) => url === "/login" || url.startsWith("/login"),
  ),
  "precache non deve includere /login",
);

const buildScript = read("scripts/build-pwa-sw.ts");
assert.match(buildScript, /sw-worker-entry/, "build script usa sw-worker-entry");
assert.match(buildScript, /productionBuild/, "build production rilevata esplicitamente");
assert.match(buildScript, /production builds require/i, "build production senza versione deve fallire");
assert.doesNotMatch(buildScript, /readPackageVersion/, "versione package non può identificare un deploy");

const workerImports = read("lib/pwa/index.ts");
assert.doesNotMatch(workerImports, /sw-worker-entry/, "barrel non esporta sw-worker-entry");

const repoFiles = ["app", "components", "src", "lib", "scripts"];
for (const dir of repoFiles) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const stack = [abs];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (full.replace(/\\/g, "/").endsWith("lib/pwa/sw-worker-entry.ts")) continue;
      if (full.replace(/\\/g, "/").endsWith("scripts/build-pwa-sw.ts")) continue;
      if (full.replace(/\\/g, "/").includes("/lib/regression/")) continue;
      const source = fs.readFileSync(full, "utf8");
      assert.doesNotMatch(
        source,
        /from ["']@\/lib\/pwa\/sw-worker-entry|from ["'].*sw-worker-entry/,
        `${path.relative(ROOT, full)} non deve importare sw-worker-entry`,
      );
    }
  }
}

console.log("pwa-sw-policy: ok");
