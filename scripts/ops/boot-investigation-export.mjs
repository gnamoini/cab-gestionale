#!/usr/bin/env node
/**
 * Export boot investigation JSON from a Playwright page or saved file.
 * Usage:
 *   node scripts/ops/boot-investigation-export.mjs [input.json]
 * If no input, writes placeholder schema to test-results/boot-investigation.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "test-results");
const OUT_FILE = path.join(OUT_DIR, "boot-investigation.json");

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    const placeholder = {
      note: "Run boot-investigation-collect.mjs or paste window.__cabBootInvestigation() output here",
      exportedAt: new Date().toISOString(),
      enabled: false,
      eventCount: 0,
      events: [],
      loopAlerts: [],
      renderTotals: {},
      topRenders: [],
    };
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(placeholder, null, 2));
    console.log(`Wrote placeholder → ${OUT_FILE}`);
    return;
  }
  const abs = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
  const raw = fs.readFileSync(abs, "utf8");
  const data = JSON.parse(raw);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  console.log(`Exported → ${OUT_FILE} (${data.eventCount ?? "?"} events, ${data.loopAlerts?.length ?? 0} loop alerts)`);
}

main();
