import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { computePerformanceScore } from "@/lib/performance/performance-score";

const ROOT = process.cwd();

function loadJson(rel: string) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

const build = loadJson("test-results/build-budget-snapshot.json");
const snapshot = loadJson("test-results/performance-snapshot.json");
const lighthouse = loadJson("test-results/lighthouse-snapshot.json");

const score = computePerformanceScore({
  build: build ? { firstLoadJsKb: build.firstLoadJsKb, vendorChunkKb: build.vendorChunkKb } : undefined,
  snapshot: snapshot
    ? { routes: snapshot.routes, cacheHitRatio: snapshot.cacheHitRatio }
    : undefined,
  lighthouse: lighthouse?.vitals,
  policyPass: true,
});

process.stdout.write(JSON.stringify(score));
