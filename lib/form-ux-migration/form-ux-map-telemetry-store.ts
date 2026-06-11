import fs from "node:fs";
import path from "node:path";

export type MapTelemetryFieldSnapshot = {
  fieldKey: string;
  evaluations: number;
  mismatches: number;
  mismatchRate: number;
  rollbacks: number;
  submitDivergences: number;
};

export type MapTelemetryDailySnapshot = {
  date: string;
  exportedAt: string;
  globalMismatchRate: number;
  globalRollbackRate: number;
  fields: MapTelemetryFieldSnapshot[];
};

const DEFAULT_TELEMETRY_DIR = "map/telemetry";

function listSnapshotFiles(root: string, dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f))
    .sort();
}

export function readTelemetrySnapshots(options?: {
  root?: string;
  telemetryDir?: string;
  days?: number;
}): MapTelemetryDailySnapshot[] {
  const root = options?.root ?? process.cwd();
  const days = options?.days ?? 30;
  const files = listSnapshotFiles(root, options?.telemetryDir ?? DEFAULT_TELEMETRY_DIR);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const snapshots: MapTelemetryDailySnapshot[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as MapTelemetryDailySnapshot;
      const ts = Date.parse(raw.exportedAt || raw.date);
      if (!Number.isNaN(ts) && ts >= cutoff) {
        snapshots.push(raw);
      }
    } catch {
      // skip corrupt files
    }
  }

  return snapshots.sort((a, b) => a.date.localeCompare(b.date));
}

export function getFieldTelemetrySummary(
  fieldKey: string,
  options?: { root?: string; windowDays?: number },
): {
  hasData: boolean;
  mismatchCount: number;
  mismatchRate: number;
  rollbackCount: number;
  daysCovered: number;
} {
  const windowDays = options?.windowDays ?? 7;
  const snapshots = readTelemetrySnapshots({ root: options?.root, days: windowDays });
  if (snapshots.length === 0) {
    return {
      hasData: false,
      mismatchCount: 0,
      mismatchRate: 0,
      rollbackCount: 0,
      daysCovered: 0,
    };
  }

  let mismatchCount = 0;
  let evaluations = 0;
  let rollbackCount = 0;

  for (const snap of snapshots) {
    const field = snap.fields.find((f) => f.fieldKey === fieldKey);
    if (!field) continue;
    mismatchCount += field.mismatches;
    evaluations += field.evaluations;
    rollbackCount += field.rollbacks;
  }

  return {
    hasData: true,
    mismatchCount,
    mismatchRate: evaluations > 0 ? mismatchCount / evaluations : 0,
    rollbackCount,
    daysCovered: snapshots.length,
  };
}

export function aggregateGlobalTelemetryRates(options?: {
  root?: string;
  days?: number;
}): { mismatchRate: number; rollbackRate: number } {
  const snapshots = readTelemetrySnapshots(options);
  if (snapshots.length === 0) {
    return { mismatchRate: 0, rollbackRate: 0 };
  }

  const latest = snapshots[snapshots.length - 1]!;
  return {
    mismatchRate: latest.globalMismatchRate,
    rollbackRate: latest.globalRollbackRate,
  };
}

export function writeTelemetrySnapshot(
  snapshot: MapTelemetryDailySnapshot,
  options?: { root?: string; telemetryDir?: string },
): string {
  const root = options?.root ?? process.cwd();
  const dir = path.join(root, options?.telemetryDir ?? DEFAULT_TELEMETRY_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${snapshot.date}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
  return file;
}
