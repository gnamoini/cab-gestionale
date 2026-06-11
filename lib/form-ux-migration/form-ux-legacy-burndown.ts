import fs from "node:fs";
import path from "node:path";
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationRiskTier } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { aggregateGlobalTelemetryRates } from "@/lib/form-ux-migration/form-ux-map-telemetry-store";
import type { FormUxDomain } from "@/lib/form-ux-migration/types";

export type BurndownSnapshot = {
  date: string;
  legacyRemaining: number;
  legacyByDomain: Partial<Record<FormUxDomain, number>>;
  legacyByTier: Record<MigrationRiskTier, number>;
  ssotPct: number;
  totalFields: number;
};

export type BurndownTrend = {
  snapshots: BurndownSnapshot[];
  velocityFieldsPerWeek: number;
  rollbackRate: number;
  mismatchRate: number;
  promotionRate: number;
  etaDaysTo80: number;
  etaDaysTo100: number;
};

const DEFAULT_BURNDOWN_DIR = "map/burndown";
const DEFAULT_VELOCITY_FIELDS_PER_WEEK = 8;

function listBurndownFiles(root: string, dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f))
    .sort();
}

export function buildBurndownSnapshot(options?: { root?: string }): BurndownSnapshot {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });

  const legacyByTier: BurndownSnapshot["legacyByTier"] = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const legacyByDomain: Partial<Record<FormUxDomain, number>> = {};

  for (const profile of profiles) {
    if (profile.status !== "legacy") continue;
    legacyByTier[profile.tier] += 1;
    if (profile.formId != null) {
      const entry = fields.find((f) => f.fieldKey === profile.fieldKey);
      const domain = entry?.domain;
      if (domain) {
        legacyByDomain[domain] = (legacyByDomain[domain] ?? 0) + 1;
      }
    }
  }

  const legacyRemaining = fields.filter((f) => f.status === "legacy").length;
  const ssotCount = fields.filter(
    (f) => f.status === "ssot" || f.status === "hybrid",
  ).length;
  const totalFields = fields.length;

  return {
    date: new Date().toISOString().slice(0, 10),
    legacyRemaining,
    legacyByDomain,
    legacyByTier,
    ssotPct: totalFields > 0 ? Math.round((ssotCount / totalFields) * 100) : 100,
    totalFields,
  };
}

export function readBurndownSnapshots(options?: {
  root?: string;
  burndownDir?: string;
  days?: number;
}): BurndownSnapshot[] {
  const root = options?.root ?? process.cwd();
  const days = options?.days ?? 30;
  const files = listBurndownFiles(root, options?.burndownDir ?? DEFAULT_BURNDOWN_DIR);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const snapshots: BurndownSnapshot[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as BurndownSnapshot;
      const ts = Date.parse(raw.date);
      if (!Number.isNaN(ts) && ts >= cutoff) {
        snapshots.push(raw);
      }
    } catch {
      // skip corrupt
    }
  }

  return snapshots.sort((a, b) => a.date.localeCompare(b.date));
}

export function writeBurndownSnapshot(
  snapshot?: BurndownSnapshot,
  options?: { root?: string; burndownDir?: string },
): string {
  const root = options?.root ?? process.cwd();
  const data = snapshot ?? buildBurndownSnapshot({ root });
  const dir = path.join(root, options?.burndownDir ?? DEFAULT_BURNDOWN_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${data.date}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

function computeVelocity(snapshots: BurndownSnapshot[]): number {
  if (snapshots.length < 2) return DEFAULT_VELOCITY_FIELDS_PER_WEEK;

  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  const days = Math.max(
    1,
    (Date.parse(last.date) - Date.parse(first.date)) / (24 * 60 * 60 * 1000),
  );
  const legacyBurned = first.legacyRemaining - last.legacyRemaining;
  const perWeek = (legacyBurned / days) * 7;
  if (perWeek <= 0) return DEFAULT_VELOCITY_FIELDS_PER_WEEK;
  return perWeek;
}

function computePromotionRate(snapshots: BurndownSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  const ssotGain = last.ssotPct - first.ssotPct;
  const days = Math.max(
    1,
    (Date.parse(last.date) - Date.parse(first.date)) / (24 * 60 * 60 * 1000),
  );
  return Math.round((ssotGain / days) * 7 * 10) / 10;
}

function etaDays(
  currentSsotPct: number,
  targetPct: number,
  velocityFieldsPerWeek: number,
  totalFields: number,
): number {
  if (currentSsotPct >= targetPct) return 0;
  const targetFields = Math.ceil((targetPct / 100) * totalFields);
  const currentSsotFields = Math.round((currentSsotPct / 100) * totalFields);
  const remaining = Math.max(0, targetFields - currentSsotFields);
  if (velocityFieldsPerWeek <= 0) return 9999;
  return Math.ceil((remaining / velocityFieldsPerWeek) * 7);
}

export function computeBurndownTrend(options?: {
  root?: string;
  burndownDir?: string;
}): BurndownTrend {
  const root = options?.root ?? process.cwd();
  const snapshots = readBurndownSnapshots({ root, burndownDir: options?.burndownDir });
  const current = buildBurndownSnapshot({ root });
  const allSnapshots = snapshots.length > 0 ? snapshots : [current];
  const velocity = computeVelocity(allSnapshots);
  const telemetry = aggregateGlobalTelemetryRates({ root });

  const ssotPct = current.ssotPct;
  const totalFields = current.totalFields;

  return {
    snapshots: allSnapshots,
    velocityFieldsPerWeek: Math.round(velocity * 10) / 10,
    rollbackRate: telemetry.rollbackRate,
    mismatchRate: telemetry.mismatchRate,
    promotionRate: computePromotionRate(allSnapshots),
    etaDaysTo80: etaDays(ssotPct, 80, velocity, totalFields),
    etaDaysTo100: etaDays(ssotPct, 100, velocity, totalFields),
  };
}

export function etaDaysToTarget(
  targetPct: number,
  options?: { root?: string },
): number {
  const trend = computeBurndownTrend(options);
  const current = buildBurndownSnapshot(options);
  return etaDays(
    current.ssotPct,
    targetPct,
    trend.velocityFieldsPerWeek,
    current.totalFields,
  );
}
