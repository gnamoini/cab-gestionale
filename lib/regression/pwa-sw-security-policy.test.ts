import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { classifyRequest } from "@/lib/pwa/sw-runtime";

const ROOT = process.cwd();
const origin = "https://gestionale.example";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const runtimeSource = read("lib/pwa/sw-runtime.ts");
assert.doesNotMatch(runtimeSource, /server-only/, "sw-runtime: no server-only");
assert.doesNotMatch(runtimeSource, /from "react"/, "sw-runtime: no react");
assert.doesNotMatch(runtimeSource, /@\/lib\/auth/, "sw-runtime: no auth imports");
assert.doesNotMatch(runtimeSource, /@\/components/, "sw-runtime: no components imports");

assert.equal(
  classifyRequest(new URL("wss://x.supabase.co/realtime/v1"), "GET"),
  "bypass",
  "websocket bypass",
);

assert.equal(
  classifyRequest(new URL("https://abc.supabase.co/rest/v1/lavorazioni", origin), "GET"),
  "network-only",
);

assert.equal(
  classifyRequest(new URL(`${origin}/api/export/jobs`, origin), "GET"),
  "network-only",
);

assert.equal(classifyRequest(new URL(`${origin}/dashboard`, origin), "GET", "navigate"), "network-only");

assert.notEqual(
  classifyRequest(new URL(`${origin}/dashboard`, origin), "GET", "navigate"),
  "cache-first",
);

assert.equal(classifyRequest(new URL(`${origin}/dashboard`, origin), "POST"), "network-only");
assert.equal(classifyRequest(new URL(`${origin}/lavorazioni`, origin), "PATCH"), "network-only");

assert.equal(
  classifyRequest(new URL(`${origin}/_next/static/chunks/main.js`, origin), "GET"),
  "cache-first",
);

assert.equal(
  classifyRequest(new URL(`${origin}/login`, origin), "GET", "navigate"),
  "network-first",
);

const workerSource = read("lib/pwa/sw-worker-entry.ts");
assert.match(workerSource, /NetworkOnly/, "worker usa NetworkOnly");
assert.match(workerSource, /classifyRequest/, "worker delega classifyRequest");
assert.doesNotMatch(workerSource, /CacheFirst[\s\S]*supabase/, "worker: no CacheFirst su supabase");

console.log("pwa-sw-security-policy: ok");
