import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const batch = read("lib/schede/schede-bundles-fetch.ts");
assert.match(batch, /\.in\("lavorazione_id"/, "batch schede must use .in(lavorazione_id)");
assert.match(batch, /SCHEde_BATCH_IN_CHUNK/, "batch schede must chunk IN clause");

const adapter = read("lib/schede/schede-sync-adapter.ts");
assert.match(adapter, /fetchSchedeRowsByLavorazioneIdsAuthorized/, "sync adapter must use single batch rows fetch");
assert.doesNotMatch(
  adapter,
  /fetchSchedeBundlesStoreAuthorized[\s\S]*fetchSchedeRowsByLavorazioneIdsAuthorized/,
  "sync adapter must not double-fetch rows and bundles in parallel",
);
assert.doesNotMatch(adapter, /SCHEde_FETCH_CONCURRENCY/, "per-id concurrency loop removed");

const server = read("lib/schede/schede-bundles-fetch-server.ts");
assert.match(server, /"server-only"/);
assert.match(server, /verifyServerPageRead/);

console.log("schede-bundles-batch: ok");
