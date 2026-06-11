/**
 * Import MAP telemetry snapshot from exported browser JSON.
 *
 * In dev, copy window.__FORM_UX_MIGRATION__ from the browser console, save as
 * map/telemetry-export.json, then run:
 *   npx tsx scripts/form-ux-map-export-telemetry.ts map/telemetry-export.json
 *
 * Or pipe JSON via stdin:
 *   type map\\telemetry-export.json | npx tsx scripts/form-ux-map-export-telemetry.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  writeTelemetrySnapshot,
  type MapTelemetryDailySnapshot,
  type MapTelemetryFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-map-telemetry-store";

type BrowserExport = {
  events?: { formId?: string; fieldId?: string; mismatch?: unknown }[];
  mismatchRateByField?: Record<string, number>;
  enforcementRollbacks?: number;
  mismatchCount?: number;
};

function readInput(fileArg?: string): string {
  if (fileArg && fs.existsSync(fileArg)) {
    return fs.readFileSync(fileArg, "utf8");
  }
  return fs.readFileSync(0, "utf8");
}

const inputPath = process.argv[2];
const raw = readInput(inputPath);
const parsed = JSON.parse(raw) as BrowserExport;

const fieldMap = new Map<string, MapTelemetryFieldSnapshot>();

for (const [fieldKey, rate] of Object.entries(parsed.mismatchRateByField ?? {})) {
  fieldMap.set(fieldKey, {
    fieldKey,
    evaluations: 100,
    mismatches: Math.round(rate * 100),
    mismatchRate: rate,
    rollbacks: 0,
    submitDivergences: 0,
  });
}

for (const event of parsed.events ?? []) {
  if (!event.formId || !event.fieldId) continue;
  const fieldKey = `${event.formId}.${event.fieldId}`;
  const existing = fieldMap.get(fieldKey) ?? {
    fieldKey,
    evaluations: 0,
    mismatches: 0,
    mismatchRate: 0,
    rollbacks: 0,
    submitDivergences: 0,
  };
  existing.evaluations += 1;
  if (event.mismatch != null) existing.mismatches += 1;
  existing.mismatchRate =
    existing.evaluations > 0 ? existing.mismatches / existing.evaluations : 0;
  fieldMap.set(fieldKey, existing);
}

const totalEvaluations = [...fieldMap.values()].reduce((s, f) => s + f.evaluations, 0);
const totalMismatches = [...fieldMap.values()].reduce((s, f) => s + f.mismatches, 0);

const snapshot: MapTelemetryDailySnapshot = {
  date: new Date().toISOString().slice(0, 10),
  exportedAt: new Date().toISOString(),
  globalMismatchRate: totalEvaluations > 0 ? totalMismatches / totalEvaluations : 0,
  globalRollbackRate:
    totalEvaluations > 0 ? (parsed.enforcementRollbacks ?? 0) / totalEvaluations : 0,
  fields: [...fieldMap.values()],
};

const out = writeTelemetrySnapshot(snapshot);
console.log(`MAP telemetry snapshot written: ${out}`);
console.log(`Fields: ${snapshot.fields.length}`);
