/**
 * Bundle dependency ranking v3.1 — bundleImpactScore = gzipKb × effectiveReach × firstLoadFactor
 */
import { createGzip } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { readCliArgValue } from "./benchmark-environment";
import {
  bundleImpactScoreV2,
  computeGlobalReach,
  effectiveReachForScope,
  inferReachScope,
  type ReachScope,
} from "@/lib/performance/bundle-ranking-types";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const ROUTE_STATS = join(NEXT_DIR, "diagnostics", "route-bundle-stats.json");
const BUILD_MANIFEST = join(NEXT_DIR, "build-manifest.json");
const DEFAULT_OUT = join(ROOT, "test-results", "bundle-dependency-ranking-sprint26.json");

type RouteEntry = {
  route: string;
  firstLoadUncompressedJsBytes?: number;
  firstLoadChunkPaths?: string[];
};

async function gzipKbFromBytes(buf: Buffer): Promise<number> {
  const chunks: Buffer[] = [];
  await pipeline(Readable.from(buf), createGzip(), async function* (source) {
    for await (const c of source) chunks.push(c as Buffer);
  });
  return Math.round((Buffer.concat(chunks).length / 1024) * 10) / 10;
}

function listAllChunks(): { path: string; rawKb: number }[] {
  const chunksDir = join(NEXT_DIR, "static", "chunks");
  if (!existsSync(chunksDir)) return [];
  const out: { path: string; rawKb: number }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".js")) {
        out.push({ path: p.replace(/\\/g, "/"), rawKb: Math.round((statSync(p).size / 1024) * 10) / 10 });
      }
    }
  };
  walk(chunksDir);
  return out;
}

function loadInitialChunkBases(): Set<string> {
  const bases = new Set<string>();
  if (!existsSync(BUILD_MANIFEST)) return bases;
  const manifest = JSON.parse(readFileSync(BUILD_MANIFEST, "utf8").replace(/^\uFEFF/, "")) as {
    rootMainFiles?: string[];
    polyfillFiles?: string[];
  };
  for (const f of [...(manifest.rootMainFiles ?? []), ...(manifest.polyfillFiles ?? [])]) {
    const norm = f.replace(/\\/g, "/");
    bases.add(norm.split("/").pop() ?? norm);
  }
  return bases;
}

function firstLoadFactorForChunk(chunkBase: string, routeChunkKeys: string[], initialBases: Set<string>): number {
  if (initialBases.has(chunkBase)) return 1.0;
  const inFirstLoadRoutes = routeChunkKeys.some((k) => k.endsWith(chunkBase));
  if (inFirstLoadRoutes) return 0.5;
  return 0.2;
}

function globalFirstLoadKb(routes: RouteEntry[]): number {
  let max = 0;
  for (const r of routes) {
    const kb = Math.round(((r.firstLoadUncompressedJsBytes ?? 0) / 1024) * 10) / 10;
    max = Math.max(max, kb);
  }
  return max;
}

async function main(): Promise<void> {
  if (!existsSync(ROUTE_STATS)) {
    console.error("bundle-dependency-ranking: run npm run build first");
    process.exit(1);
  }

  const outPath = readCliArgValue(process.argv, "--out=") ?? DEFAULT_OUT;
  const routes = JSON.parse(readFileSync(ROUTE_STATS, "utf8").replace(/^\uFEFF/, "")) as RouteEntry[];
  const totalRoutes = routes.length || 1;
  const initialBases = loadInitialChunkBases();
  const chunkRouteMap = new Map<string, Set<string>>();

  for (const entry of routes) {
    for (const chunk of entry.firstLoadChunkPaths ?? []) {
      const key = chunk.replace(/\\/g, "/");
      if (!chunkRouteMap.has(key)) chunkRouteMap.set(key, new Set());
      chunkRouteMap.get(key)!.add(entry.route);
    }
  }

  const allChunks = listAllChunks();
  const ranked = [];

  for (const chunk of allChunks) {
    const base = chunk.path.split("/").pop() ?? chunk.path;
    const routeHits = new Set<string>();
    const routeChunkKeys: string[] = [];
    for (const [path, routeSet] of chunkRouteMap) {
      if (path.endsWith(base) || chunk.path.endsWith(path)) {
        routeChunkKeys.push(path);
        for (const r of routeSet) routeHits.add(r);
      }
    }
    const globalReach = computeGlobalReach([...routeHits], totalRoutes);
    const reachScope = inferReachScope(globalReach);
    const effectiveReach = effectiveReachForScope(globalReach, reachScope);
    const firstLoadFactor = firstLoadFactorForChunk(base, routeChunkKeys, initialBases);
    const buf = readFileSync(chunk.path);
    const gzipKb = await gzipKbFromBytes(buf);
    const bundleImpactScore = bundleImpactScoreV2(gzipKb, effectiveReach, firstLoadFactor);
    ranked.push({
      chunk: base,
      chunkPath: chunk.path,
      rawKb: chunk.rawKb,
      gzipKb,
      routeImpact: [...routeHits].sort(),
      globalReach,
      reachScope,
      effectiveReach,
      firstLoadFactor,
      bundleImpactScore,
      action: effectiveReach > 0.8 && firstLoadFactor >= 0.5 ? "defer" : effectiveReach > 0.3 ? "dynamic" : "keep",
    });
  }

  ranked.sort((a, b) => b.bundleImpactScore - a.bundleImpactScore);

  const report = {
    generatedAt: new Date().toISOString(),
    schemaVersion: "3.1",
    totalRoutes,
    firstLoadJsKb: globalFirstLoadKb(routes),
    formula: "gzipKb × effectiveReach × firstLoadFactor",
    topImpact: ranked.slice(0, 40),
    allChunks: ranked,
  };

  mkdirSync(join(ROOT, "test-results"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`bundle-dependency-ranking: wrote ${outPath} (${ranked.length} chunks) firstLoad=${report.firstLoadJsKb}KB`);
}

void main();
