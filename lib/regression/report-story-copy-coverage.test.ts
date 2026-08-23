import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "components", "report", "areas");
const PREFIX_TO_KEYS: Record<string, string> = {
  "report-area-lavorazioni-view.tsx": "lav-",
  "report-area-magazzino-view.tsx": "mag-",
  "report-area-dipendenti-view.tsx": "dip-",
  "report-area-mezzi-view.tsx": "mez-",
  "report-area-ai-view.tsx": "ai-",
  "report-area-panoramica-view.tsx": "pan-",
  "report-area-economia-view.tsx": "eco-",
  "report-area-preventivi-view.tsx": "prev-",
  "report-area-clienti-view.tsx": "cli-",
  "report-area-trasversali-view.tsx": "cross-",
  "report-area-contesto-view.tsx": "contesto-",
};

for (const [file, prefix] of Object.entries(PREFIX_TO_KEYS)) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");
  const matches = content.match(/getReportStoryCopy\("([^"]+)"\)/g) ?? [];
  const keys = matches.map((m) => m.replace('getReportStoryCopy("', "").replace('")', ""));
  const areaKeys = keys.filter((k) => k.startsWith(prefix));
  assert.ok(areaKeys.length >= 2, `${file} must call getReportStoryCopy with at least 2 area keys (${prefix}*)`);
}

console.log("report-story-copy-coverage.test.ts OK");
