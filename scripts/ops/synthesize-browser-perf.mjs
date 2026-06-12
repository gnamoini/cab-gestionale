/**
 * Synthesize per-route browser timing from REST benchmark (network-bound proxy).
 * Usage: node scripts/ops/synthesize-browser-perf.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const benchPath = join(process.cwd(), "test-results", "rest-benchmark-roles.json");
const computePath = join(process.cwd(), "test-results", "client-compute-benchmark.json");

if (!existsSync(benchPath)) {
  console.error("Missing rest-benchmark-roles.json — run rest-benchmark-roles.mjs first");
  process.exit(1);
}

const bench = JSON.parse(readFileSync(benchPath, "utf8"));
const compute = existsSync(computePath) ? JSON.parse(readFileSync(computePath, "utf8")) : null;

const role = bench.benchmarks?.find((b) => b.role === "admin") ?? bench.benchmarks?.[0];
if (!role) process.exit(1);

const parseUs = compute?.benchmarks?.find((b) => b.label === "json_parse_payload")?.perRunUs ?? 100;
const filterSortUs = compute?.benchmarks?.find((b) => b.label === "lav_filter_plus_sort")?.perRunUs ?? 22;

function seqMs(name) {
  return role.sequential.find((q) => q.name === name)?.wallMs ?? 0;
}

const routes = [
  {
    route: "/lavorazioni",
    role: role.role,
    mode: "cold_proxy",
    restWallMs: role.lavorazioniScreen.parallelMs,
    queries: role.lavorazioniScreen.queries,
    estimatedParseMs: Math.round((parseUs * 2) / 1000),
    estimatedClientComputeMs: Math.round((filterSortUs * 2) / 1000),
    estimatedRenderMs: 15,
    estimatedTotalMs: Math.round(role.lavorazioniScreen.parallelMs + parseUs / 500 + 20),
  },
  {
    route: "/mezzi",
    role: role.role,
    mode: "cold_proxy",
    restWallMs: seqMs("mezzi_list") + seqMs("lavorazioni_D_full"),
    estimatedParseMs: Math.round(parseUs / 1000),
    estimatedClientComputeMs: 2,
    estimatedRenderMs: 12,
    estimatedTotalMs: Math.round(seqMs("mezzi_list") + seqMs("lavorazioni_D_full") + 15),
  },
  {
    route: "/magazzino",
    role: role.role,
    mode: "cold_proxy",
    restWallMs: seqMs("magazzino_list"),
    estimatedParseMs: Math.round(parseUs / 1000),
    estimatedClientComputeMs: 3,
    estimatedRenderMs: 10,
    estimatedTotalMs: Math.round(seqMs("magazzino_list") + 15),
  },
  {
    route: "/report",
    role: role.role,
    mode: "cold_proxy",
    restWallMs: role.report.parallelMs,
    queries: role.report.queries,
    estimatedParseMs: Math.round((parseUs * 4) / 1000),
    estimatedClientComputeMs: compute?.benchmarks?.find((b) => b.label === "report_fingerprint_hash")?.perRunUs
      ? Math.round(compute.benchmarks.find((b) => b.label === "report_fingerprint_hash").perRunUs / 1000)
      : 5,
    estimatedRenderMs: 25,
    estimatedTotalMs: Math.round(role.report.parallelMs + 35),
  },
  {
    route: "/dashboard",
    role: role.role,
    mode: "cold_proxy",
    restWallMs:
      seqMs("lavorazioni_A_columns_only") +
      seqMs("magazzino_list") +
      seqMs("dashboard_promemoria"),
    estimatedParseMs: Math.round((parseUs * 3) / 1000),
    estimatedClientComputeMs: 2,
    estimatedRenderMs: 18,
    estimatedTotalMs: Math.round(
      seqMs("lavorazioni_A_columns_only") + seqMs("magazzino_list") + seqMs("dashboard_promemoria") + 25,
    ),
  },
];

const out = {
  generatedAt: new Date().toISOString(),
  method: "REST proxy synthesis — Playwright skipped (no local server / SMOKE_ADMIN in env)",
  role: role.role,
  routes,
};

writeFileSync(join(process.cwd(), "test-results", "perf-audit-synthetic.json"), JSON.stringify(out, null, 2));
process.stdout.write(JSON.stringify(out, null, 2));
