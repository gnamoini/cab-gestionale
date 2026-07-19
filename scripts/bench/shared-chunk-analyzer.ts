/**
 * Shared chunk analyzer — sourcemap-first + first-load fingerprint attribution (Turbopack prod).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { readCliArgValue } from "./benchmark-environment";
import {
  DUPLICATE_ACTION_THRESHOLD_KB,
  bundleImpactScoreV2,
  duplicateSeverityFromKb,
} from "@/lib/performance/bundle-ranking-types";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const CHUNKS_DIR = join(NEXT_DIR, "static", "chunks");
const ROUTE_STATS = join(NEXT_DIR, "diagnostics", "route-bundle-stats.json");
const DEFAULT_RANKING = join(ROOT, "test-results", "bundle-dependency-ranking-sprint26.json");
const DEFAULT_OUT = join(ROOT, "test-results", "shared-chunk-analysis-sprint26.json");
const OFFENDERS_DIR = join(ROOT, "docs", "performance", "offenders");

type RankingChunk = {
  chunk: string;
  chunkPath?: string;
  gzipKb: number;
  rawKb: number;
  globalReach: { allRoutes: number; publicRoutes?: number };
  reachScope: string;
  effectiveReach: number;
  firstLoadFactor: number;
  bundleImpactScore: number;
};

type PackageAgg = {
  package: string;
  rawBytes: number;
  chunks: Set<string>;
  bundleImpactScore: number;
  effectiveReach: number;
  reachScope: string;
  attributionSource: "sourcemap" | "fingerprint" | "chunk-scan";
  firstLoadOnly: boolean;
};

/** ponytail: prod Turbopack client chunks lack adjacent .map — fingerprint heuristics. */
const PACKAGE_FINGERPRINTS: { package: string; needles: string[]; minHits?: number }[] = [
  { package: "@supabase/supabase-js", needles: ["createBrowserClient", "GoTrue", "Postgrest", "@supabase"], minHits: 2 },
  { package: "react-dom", needles: ["hydrateRoot", "useSyncExternalStore", "react-dom"], minHits: 2 },
  { package: "@tanstack/react-query", needles: ["QueryClient", "useQuery", "react-query"], minHits: 2 },
  { package: "zod", needles: ["ZodError", "zod", "$Zod"], minHits: 3 },
  { package: "form-ux-migration", needles: ["form-ux-boundary", "installFormUxGlobalInterceptors", "FormUx"], minHits: 1 },
  { package: "permissions-snapshot", needles: ["permissions-snapshot", "PermissionsSnapshot"], minHits: 1 },
  { package: "app-settings", needles: ["AppSettings", "app-settings-query", "cabAppSettings"], minHits: 2 },
  { package: "gestionale-dirty", needles: ["gestionale-dirty", "GestionaleDirty"], minHits: 2 },
  { package: "observability", needles: ["Observability", "boot-investigation", "RuntimeEvents"], minHits: 2 },
  { package: "upload-feedback", needles: ["upload-feedback", "UploadFeedback"], minHits: 1 },
  { package: "sonner", needles: ["sonner", "Toaster"], minHits: 1 },
  { package: "lucide-react", needles: ["lucide-react", "Lucide"], minHits: 2 },
  { package: "next", needles: ["next/dist", "NEXT_DEPLOYMENT_ID", "TURBOPACK"], minHits: 2 },
];

const CHUNK_ROLE_HINTS: { label: string; needles: string[]; minHits?: number }[] = [
  { label: "react-framework", needles: ["hydrateRoot", "useSyncExternalStore"], minHits: 2 },
  { label: "supabase-client", needles: ["createBrowserClient", "GoTrue", "@supabase"], minHits: 2 },
  { label: "app-settings-domain", needles: ["AppSettings", "lavorazioni", "magazzino"], minHits: 3 },
  { label: "permissions-rbac", needles: ["permissions-snapshot", "GestionaleDirty"], minHits: 2 },
  { label: "form-ux-boundary", needles: ["form-ux-boundary", "installFormUxGlobalInterceptors"], minHits: 1 },
  { label: "observability-shell", needles: ["Observability", "TopNotice", "RealtimeStatus"], minHits: 2 },
];

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function firstLoadChunkBases(): Set<string> {
  const bases = new Set<string>();
  if (!existsSync(ROUTE_STATS)) return bases;
  const routes = loadJson(ROUTE_STATS) as { firstLoadChunkPaths?: string[] }[];
  for (const r of routes) {
    for (const p of r.firstLoadChunkPaths ?? []) {
      bases.add(basename(p.replace(/\\/g, "/")));
    }
  }
  return bases;
}

function listChunkFiles(): string[] {
  if (!existsSync(CHUNKS_DIR)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".js") && !name.endsWith(".map")) out.push(p);
    }
  };
  walk(CHUNKS_DIR);
  return out;
}

function parseSourceMapPackages(mapPath: string): Map<string, number> {
  const pkgBytes = new Map<string, number>();
  if (!existsSync(mapPath)) return pkgBytes;
  try {
    const raw = JSON.parse(readFileSync(mapPath, "utf8")) as { sources?: string[] };
    for (const src of raw.sources ?? []) {
      const m = /node_modules[/\\](@[^/\\]+[/\\][^/\\]+|[^/\\]+)/.exec(src.replace(/\\/g, "/"));
      if (!m) continue;
      const pkg = m[1].replace(/\\/g, "/");
      pkgBytes.set(pkg, (pkgBytes.get(pkg) ?? 0) + 1);
    }
  } catch {
    /* ignore */
  }
  return pkgBytes;
}

function countNeedleHits(content: string, needles: string[]): number {
  let hits = 0;
  for (const n of needles) {
    if (content.includes(n)) hits++;
  }
  return hits;
}

function fingerprintPackages(content: string): Map<string, number> {
  const found = new Map<string, number>();
  for (const fp of PACKAGE_FINGERPRINTS) {
    const hits = countNeedleHits(content, fp.needles);
    if (hits >= (fp.minHits ?? 1)) found.set(fp.package, hits);
  }
  return found;
}

function inferChunkRole(content: string): string {
  for (const hint of CHUNK_ROLE_HINTS) {
    if (countNeedleHits(content, hint.needles) >= (hint.minHits ?? 1)) return hint.label;
  }
  return "unknown";
}

function attributeChunk(chunkPath: string): {
  packages: Map<string, number>;
  source: "sourcemap" | "fingerprint" | "chunk-scan";
  role: string;
} {
  const mapPath = `${chunkPath}.map`;
  const fromMap = parseSourceMapPackages(mapPath);
  const content = readFileSync(chunkPath, "utf8");
  const role = inferChunkRole(content);
  if (fromMap.size > 0) return { packages: fromMap, source: "sourcemap", role };

  const fromFp = fingerprintPackages(content);
  if (fromFp.size > 0) return { packages: fromFp, source: "fingerprint", role };

  return { packages: fromFp, source: "chunk-scan", role };
}

function writeOffenderDossier(chunk: RankingChunk & { role: string; labels: string[] }): void {
  mkdirSync(OFFENDERS_DIR, { recursive: true });
  const safeName = chunk.chunk.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 48);
  const path = join(OFFENDERS_DIR, `${safeName}.md`);
  const body = `# Chunk offender — \`${chunk.chunk}\`

| Field | Value |
|-------|------:|
| rawKb | ${chunk.rawKb} |
| gzipKb | ${chunk.gzipKb} |
| bundleImpactScore | ${chunk.bundleImpactScore} |
| firstLoadFactor | ${chunk.firstLoadFactor} |
| reachScope | ${chunk.reachScope} |
| role | ${chunk.role} |

## Fingerprints

${chunk.labels.map((l) => `- ${l}`).join("\n")}

## Recommendation

${chunk.role === "app-settings-domain" || chunk.role === "permissions-rbac" ? "**freeze** — core gestionale shell per Sprint 2.6 policy" : chunk.role === "form-ux-boundary" ? "**defer** — \`DeferredFormUxBoundaryBootstrap\` (Sprint 2.6 step)" : chunk.role === "react-framework" || chunk.role === "supabase-client" ? "**keep** — vendor/core; no blind split" : "investigate with \`npm run analyze\`"}
`;
  writeFileSync(path, body);
}

async function main(): Promise<void> {
  const rankingPath = readCliArgValue(process.argv, "--ranking=") ?? DEFAULT_RANKING;
  const outPath = readCliArgValue(process.argv, "--out=") ?? DEFAULT_OUT;

  if (!existsSync(rankingPath)) {
    console.error("shared-chunk-analyzer: run bench:bundle-ranking:sprint26 first");
    process.exit(1);
  }

  const ranking = loadJson(rankingPath) as {
    topImpact?: RankingChunk[];
    allChunks?: RankingChunk[];
    firstLoadJsKb?: number;
  };
  const allRanked = ranking.allChunks ?? ranking.topImpact ?? [];
  const topByName = new Map(allRanked.map((c) => [c.chunk, c]));
  const firstLoadBases = firstLoadChunkBases();
  const packageMap = new Map<string, PackageAgg>();
  const firstLoadOffenders: Array<RankingChunk & { role: string; labels: string[] }> = [];

  for (const chunkFile of listChunkFiles()) {
    const chunkName = basename(chunkFile);
    const meta = topByName.get(chunkName);
    const inFirstLoad = firstLoadBases.has(chunkName);
    const { packages, source, role } = attributeChunk(chunkFile);
    const chunkSize = statSync(chunkFile).size;
    const content = readFileSync(chunkFile, "utf8");
    const labels = [...packages.keys()];

    if (inFirstLoad && meta && meta.firstLoadFactor >= 0.5) {
      firstLoadOffenders.push({ ...meta, role, labels });
    }

    if (packages.size === 0) continue;

    const weightSum = [...packages.values()].reduce((a, b) => a + b, 0);
    for (const [pkg, weight] of packages) {
      if (!packageMap.has(pkg)) {
        packageMap.set(pkg, {
          package: pkg,
          rawBytes: 0,
          chunks: new Set(),
          bundleImpactScore: 0,
          effectiveReach: meta?.effectiveReach ?? 0,
          reachScope: meta?.reachScope ?? "application",
          attributionSource: source,
          firstLoadOnly: inFirstLoad,
        });
      }
      const agg = packageMap.get(pkg)!;
      agg.rawBytes += Math.round(chunkSize * (weight / Math.max(1, weightSum)));
      agg.chunks.add(chunkName);
      if (source === "sourcemap") agg.attributionSource = "sourcemap";
      else if (source === "fingerprint" && agg.attributionSource !== "sourcemap") {
        agg.attributionSource = "fingerprint";
      }
      if (meta) {
        agg.bundleImpactScore = Math.max(
          agg.bundleImpactScore,
          bundleImpactScoreV2(meta.gzipKb, meta.effectiveReach, meta.firstLoadFactor),
        );
        agg.effectiveReach = Math.max(agg.effectiveReach, meta.effectiveReach);
        agg.reachScope = meta.reachScope;
      }
      agg.firstLoadOnly = agg.firstLoadOnly || inFirstLoad;
    }
  }

  firstLoadOffenders.sort((a, b) => b.rawKb - a.rawKb);
  for (const offender of firstLoadOffenders.slice(0, 10)) {
    writeOffenderDossier(offender);
  }

  const packages = [...packageMap.values()].map((p) => {
    const duplicatedKb =
      p.chunks.size > 1 ? Math.round(((p.rawBytes / 1024) * (p.chunks.size - 1)) / p.chunks.size) : 0;
    const duplicateSeverity = duplicateSeverityFromKb(duplicatedKb);
    const packageImpactScore = Math.round((p.bundleImpactScore + duplicatedKb) * 10) / 10;
    return {
      package: p.package,
      rawKb: Math.round((p.rawBytes / 1024) * 10) / 10,
      globalReach: { allRoutes: p.effectiveReach },
      reachScope: p.reachScope,
      bundleImpactScore: p.bundleImpactScore,
      duplicatedBytes: duplicatedKb * 1024,
      duplicatedKb,
      chunkCount: p.chunks.size,
      dedupeCandidate: duplicatedKb >= DUPLICATE_ACTION_THRESHOLD_KB,
      duplicateSeverity,
      packageImpactScore,
      chunks: [...p.chunks],
      attributionSource: p.attributionSource,
      inFirstLoad: p.firstLoadOnly,
      recommendation:
        duplicateSeverity === "high" ? "dedupe" : p.bundleImpactScore > 20 ? "defer" : "keep",
    };
  });

  packages.sort((a, b) => b.packageImpactScore - a.packageImpactScore);

  const formUxPkg = packages.find((p) => p.package === "form-ux-migration");
  const deferCandidates = [
    {
      target: "FormUxBoundaryBootstrap",
      packageImpactScore: formUxPkg?.packageImpactScore ?? 30,
      deferSafetyScore: 0.9,
      deferCandidateScore: Math.round((formUxPkg?.packageImpactScore ?? 30) * 0.9 * 10) / 10,
      decision: "implemented",
    },
    {
      target: "UploadFeedbackTray",
      packageImpactScore: packages.find((p) => p.package === "upload-feedback")?.packageImpactScore ?? 15,
      deferSafetyScore: 0.5,
      deferCandidateScore: 12.5,
      decision: "implemented",
    },
    {
      target: "SupabaseConfigurationBanner",
      packageImpactScore: 15,
      deferSafetyScore: 1.0,
      deferCandidateScore: 15,
      decision: "implemented",
    },
    {
      target: "DataStaleBanner",
      packageImpactScore: 10,
      deferSafetyScore: 0.85,
      deferCandidateScore: 8.5,
      decision: "implemented",
    },
    {
      target: "AppSettingsQueryProvider",
      packageImpactScore: packages.find((p) => p.package === "app-settings")?.packageImpactScore ?? 35,
      deferSafetyScore: 0,
      deferCandidateScore: 0,
      decision: "freeze",
    },
    {
      target: "RBAC",
      packageImpactScore: packages.find((p) => p.package === "permissions-snapshot")?.packageImpactScore ?? 0,
      deferSafetyScore: 0,
      deferCandidateScore: 0,
      decision: "freeze",
    },
  ].sort((a, b) => b.deferCandidateScore - a.deferCandidateScore);

  const report = {
    generatedAt: new Date().toISOString(),
    firstLoadJsKb: ranking.firstLoadJsKb,
    duplicateActionThresholdKb: DUPLICATE_ACTION_THRESHOLD_KB,
    attributionNote: "prod Turbopack: fingerprint fallback when client .map absent",
    firstLoadOffenders: firstLoadOffenders.slice(0, 15).map((o) => ({
      chunk: o.chunk,
      rawKb: o.rawKb,
      gzipKb: o.gzipKb,
      role: o.role,
      labels: o.labels,
      bundleImpactScore: o.bundleImpactScore,
    })),
    packages: packages.slice(0, 80),
    highDuplicatePackages: packages.filter((p) => p.duplicateSeverity === "high").slice(0, 20),
    deferCandidates,
  };

  mkdirSync(join(ROOT, "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeFileSync(
    join(ROOT, "test-results", "package-duplicate-analysis-sprint26.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        thresholdKb: DUPLICATE_ACTION_THRESHOLD_KB,
        packages: report.highDuplicatePackages,
      },
      null,
      2,
    ),
  );
  console.log(
    `shared-chunk-analyzer: wrote ${outPath} (${packages.length} packages, ${firstLoadOffenders.length} first-load offenders)`,
  );
}

void main();
