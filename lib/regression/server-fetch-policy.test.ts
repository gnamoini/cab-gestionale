import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const SERVER_FETCH_MODULES = [
  "lib/lavorazioni/lavorazioni-list-fetch-server.ts",
  "lib/mezzi/mezzi-list-fetch.ts",
  "lib/mezzi/mezzi-list-fetch-server.ts",
  "lib/magazzino/magazzino-list-fetch.ts",
  "lib/magazzino/magazzino-list-fetch-server.ts",
  "lib/movimenti/movimenti-list-fetch.ts",
  "lib/movimenti/movimenti-list-fetch-server.ts",
  "lib/app-settings/resolve-settings-for-server.ts",
  "lib/app-settings/app-settings-fetch-server.ts",
  "lib/report/report-manual-entries-fetch-server.ts",
  "src/lib/react-query/prefetch-gestionale-page.ts",
  "lib/schede/schede-bundles-fetch-server.ts",
  "lib/bff/dashboard-data-fetch-server.ts",
  "lib/bff/documenti-dashboard-fetch-server.ts",
  "lib/bff/lavorazione-hub-fetch-server.ts",
  "lib/bff/mezzo-hub-fetch-server.ts",
  "lib/bff/report-bundle-fetch-server.ts",
  "lib/preventivi/preventivi-fetch-server.ts",
] as const;

for (const mod of SERVER_FETCH_MODULES) {
  const src = read(mod);
  assert.doesNotMatch(src, /"use client"/, `${mod} must not be a client module`);
  assert.doesNotMatch(src, /getBrowserSupabase/, `${mod} must not use browser Supabase`);
  assert.doesNotMatch(src, /select\s*\(\s*['"]\*['"]\s*\)/, `${mod} must not use select('*')`);
}

const lavServer = read("lib/lavorazioni/lavorazioni-list-fetch-server.ts");
assert.match(lavServer, /verifyServerSectionRead/, "lav server fetch must verify section read");

const mezziServer = read("lib/mezzi/mezzi-list-fetch-server.ts");
assert.match(mezziServer, /verifyServerSectionRead/, "mezzi server fetch must verify section read");

const magServer = read("lib/magazzino/magazzino-list-fetch-server.ts");
assert.match(magServer, /verifyServerSectionRead/, "magazzino server fetch must verify section read");

const impostazioniServer = read("lib/app-settings/app-settings-fetch-server.ts");
assert.match(impostazioniServer, /verifyServerPermission/, "admin settings prefetch must verify manageSettings");

const preventiviServer = read("lib/preventivi/preventivi-fetch-server.ts");
assert.match(preventiviServer, /verifyServerSectionRead/, "preventivi server fetch must verify section read");

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /dehydrate/, "prefetch module must dehydrate query client");
assert.match(prefetch, /resolveInitialLoad|query-key-factory/, "prefetch must use render-path orchestrator or key factory");
assert.doesNotMatch(
  prefetch,
  /from "@\/src\/lib\/react-query\/invalidate-related"/,
  "prefetch must not import client invalidate-related (QK.log breaks under RSC)",
);
assert.match(prefetch, /from "@\/src\/lib\/react-query\/query-keys"/, "prefetch must import QK from query-keys");

const hydration = read("src/components/gestionale/gestionale-hydration-boundary.tsx");
assert.match(hydration, /HydrationBoundary/, "hydration boundary must wrap HydrationBoundary");

console.log("server-fetch-policy: ok");
