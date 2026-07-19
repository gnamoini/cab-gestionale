/**
 * Defer displacement audit — anti-placebo: target must leave first-load, not shuffle chunks.
 * Usage: npx tsx scripts/bench/chunk-displacement-audit.ts [--baseline=] [--candidate=]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readCliArgValue } from "./benchmark-environment";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const BUILD_MANIFEST = join(NEXT_DIR, "build-manifest.json");
const ROUTE_STATS = join(NEXT_DIR, "diagnostics", "route-bundle-stats.json");
const DEFAULT_OUT = join(ROOT, "test-results", "chunk-displacement-sprint26.json");

const DIAGNOSTIC_PATTERNS = [
  { id: "boot-investigation", re: /boot-investigation/i },
  { id: "RuntimeHealthBridge", re: /runtime-health-bridge/i },
  { id: "overflow-root-cause-audit", re: /overflow-root-cause-audit/i },
  { id: "DevUxEnforcementGuard", re: /dev-ux-enforcement-guard/i },
];

const DEFER_PATTERNS = [
  { id: "UploadFeedbackProvider", re: /upload-feedback-context|upload-feedback-tray|deferred-upload-feedback/i },
  { id: "SupabaseConfigurationBanner", re: /supabase-configuration-banner|deferred-supabase-configuration/i },
  { id: "DataStaleBanner", re: /data-stale-banner|deferred-data-stale/i },
  { id: "FormUxBoundaryBootstrap", re: /form-ux-boundary-gate|deferred-form-ux-boundary/i },
];

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function listChunkFiles(): string[] {
  const chunksDir = join(NEXT_DIR, "static", "chunks");
  if (!existsSync(chunksDir)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".js")) out.push(p);
    }
  };
  walk(chunksDir);
  return out;
}

function chunkRel(abs: string): string {
  return abs.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", "");
}

function getInitialChunkPaths(allChunks: string[], manifest: { rootMainFiles?: string[]; polyfillFiles?: string[] }): string[] {
  const initialFiles = new Set(
    [...(manifest.rootMainFiles ?? []), ...(manifest.polyfillFiles ?? [])].map((f) => f.replace(/\\/g, "/")),
  );
  return allChunks.filter((c) => {
    const rel = chunkRel(c);
    const base = rel.split("/").pop() ?? rel;
    return [...initialFiles].some((f) => rel.endsWith(f) || base === f.replace(/^static\//, ""));
  });
}

function getFirstLoadChunkBases(): Set<string> {
  const bases = new Set<string>();
  if (!existsSync(ROUTE_STATS)) return bases;
  const routes = loadJson(ROUTE_STATS) as { firstLoadChunkPaths?: string[] }[];
  for (const r of routes) {
    for (const p of r.firstLoadChunkPaths ?? []) {
      bases.add(p.replace(/\\/g, "/").split("/").pop() ?? p);
    }
  }
  return bases;
}

function auditTarget(
  target: { id: string; re: RegExp },
  allChunks: string[],
  initialPaths: string[],
  firstLoadBases: Set<string>,
): {
  module: string;
  chunkCount: number;
  inInitial: boolean;
  inFirstLoadRoutes: boolean;
  removedFromFirstLoad: boolean;
  newSharedChunk: boolean;
  pass: boolean;
} {
  const hits = allChunks.filter((f) => target.re.test(readFileSync(f, "utf8").slice(0, 800_000)));
  const inInitial = hits.some((c) => initialPaths.includes(c));
  const inFirstLoadRoutes = hits.some((c) => {
    const base = chunkRel(c).split("/").pop() ?? "";
    return firstLoadBases.has(base);
  });
  const newSharedChunk = hits.length > 0 && !inInitial && inFirstLoadRoutes;
  const removedFromFirstLoad = hits.length === 0 || (!inInitial && !inFirstLoadRoutes);
  const pass = !inInitial;
  return {
    module: target.id,
    chunkCount: hits.length,
    inInitial,
    inFirstLoadRoutes,
    removedFromFirstLoad,
    newSharedChunk,
    pass,
  };
}

async function main(): Promise<void> {
  if (!existsSync(BUILD_MANIFEST)) {
    console.error("chunk-displacement-audit: run npm run build first");
    process.exit(1);
  }

  const outPath = readCliArgValue(process.argv, "--out=") ?? DEFAULT_OUT;
  const manifest = loadJson(BUILD_MANIFEST) as { rootMainFiles?: string[]; polyfillFiles?: string[] };
  const allChunks = listChunkFiles();
  const initialPaths = getInitialChunkPaths(allChunks, manifest);
  const firstLoadBases = getFirstLoadChunkBases();

  const diagnosticTargets = DIAGNOSTIC_PATTERNS.map((t) => auditTarget(t, allChunks, initialPaths, firstLoadBases));
  const deferTargets = DEFER_PATTERNS.map((t) => {
    const r = auditTarget(t, allChunks, initialPaths, firstLoadBases);
    const antiPlaceboPass = r.removedFromFirstLoad && !r.newSharedChunk;
    return { ...r, antiPlaceboPass, pass: r.pass && antiPlaceboPass };
  });

  const pass = [...diagnosticTargets, ...deferTargets].every((t) => t.pass);

  const report = {
    generatedAt: new Date().toISOString(),
    pass,
    initialFileCount: (manifest.rootMainFiles ?? []).length,
    diagnosticTargets,
    deferTargets,
  };

  mkdirSync(join(ROOT, "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`chunk-displacement-audit: wrote ${outPath} pass=${pass}`);
  if (!pass) process.exit(1);
}

void main();
