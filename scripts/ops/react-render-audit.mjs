/**
 * Process React render audit export from window.__cabRenderAudit() (dev).
 * Usage: node scripts/ops/react-render-audit.mjs [export.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const inputPath = process.argv[2];
const outDir = join(process.cwd(), "test-results");
const outPath = join(outDir, "react-render-audit.json");

const THRESHOLD = 3;
const MEMO_THRESHOLD = 5;

let payload = { entries: [], excessiveRenders: [] };

if (inputPath && existsSync(inputPath)) {
  const raw = JSON.parse(readFileSync(inputPath, "utf8").replace(/^\uFEFF/, ""));
  if (raw.entries) {
    payload = raw;
  } else if (Array.isArray(raw)) {
    payload.entries = raw;
    payload.excessiveRenders = raw.filter((e) => (e.renderCount ?? 0) > THRESHOLD);
  }
} else {
  console.log("No input. In dev with NEXT_PUBLIC_RENDER_AUDIT=1:");
  console.log("  copy JSON.stringify(window.__cabRenderAudit()) → test-results/render-audit-export.json");
}

const excessiveRenders = (payload.excessiveRenders ?? payload.entries ?? []).filter(
  (e) => (e.renderCount ?? 0) > THRESHOLD,
);

const memoCandidates = (payload.entries ?? []).filter((e) => (e.renderCount ?? 0) >= MEMO_THRESHOLD);

const out = {
  generatedAt: new Date().toISOString(),
  source: inputPath ?? null,
  threshold: THRESHOLD,
  entries: payload.entries ?? [],
  excessiveRenders: excessiveRenders.map((e) => ({ ...e, threshold: THRESHOLD })),
  memoCandidates: memoCandidates.map((e) => ({
    componentName: e.componentName ?? e.id,
    renderCount: e.renderCount,
    note: "Advisory — valutare memo solo con Profiler evidence",
  })),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
