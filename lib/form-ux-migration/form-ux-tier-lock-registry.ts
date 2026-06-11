import fs from "node:fs";
import path from "node:path";
import type { TierDriftAssessment } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { TIER0B_DRIFT_DOWNGRADE_THRESHOLD } from "@/lib/form-ux-migration/form-ux-tier-semantic-contract";
import type { FormUxFormId } from "@/lib/form-ux-migration/types";

export type Tier0BLockEntry = {
  fieldKey: string;
  fieldId: string;
  formId: FormUxFormId;
  lockedAt: string;
  lockedBy?: string;
  reason?: string;
  source: "manual" | "approved_export";
};

export type Tier0BLockRegistry = {
  version: 1;
  updatedAt: string;
  locks: Tier0BLockEntry[];
};

const DEFAULT_STABILITY_DIR = "map/stability";
const WORKING_LOCK_FILE = "tier-lock-registry.json";
const APPROVED_LOCK_FILE = "tier-lock-approved.json";

function stabilityDir(root: string): string {
  return path.join(root, DEFAULT_STABILITY_DIR);
}

function readRegistryFile(filePath: string): Tier0BLockRegistry {
  if (!fs.existsSync(filePath)) {
    return { version: 1, updatedAt: new Date().toISOString(), locks: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Tier0BLockRegistry;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      locks: Array.isArray(parsed.locks) ? parsed.locks : [],
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), locks: [] };
  }
}

function writeRegistryFile(filePath: string, registry: Tier0BLockRegistry): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({ ...registry, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

function parseFieldKey(fieldKey: string): { formId: FormUxFormId; fieldId: string } | null {
  const dot = fieldKey.indexOf(".");
  if (dot <= 0) return null;
  const formId = fieldKey.slice(0, dot) as FormUxFormId;
  const fieldId = fieldKey.slice(dot + 1);
  if (!fieldId) return null;
  return { formId, fieldId };
}

export function readWorkingLockRegistry(options?: { root?: string }): Tier0BLockRegistry {
  const root = options?.root ?? process.cwd();
  return readRegistryFile(path.join(stabilityDir(root), WORKING_LOCK_FILE));
}

export function readApprovedLockRegistry(options?: { root?: string }): Tier0BLockRegistry {
  const root = options?.root ?? process.cwd();
  return readRegistryFile(path.join(stabilityDir(root), APPROVED_LOCK_FILE));
}

export function getEffectiveLocks(options?: { root?: string }): Tier0BLockEntry[] {
  const root = options?.root ?? process.cwd();
  const working = readWorkingLockRegistry({ root }).locks;
  const approved = readApprovedLockRegistry({ root }).locks;
  const byKey = new Map<string, Tier0BLockEntry>();
  for (const entry of [...approved, ...working]) {
    byKey.set(entry.fieldKey, entry);
  }
  return [...byKey.values()];
}

/** Lock by fieldKey (formId.fieldId SSOT). */
export function lockTier0BField(
  fieldKey: string,
  meta?: { lockedBy?: string; reason?: string; root?: string },
): Tier0BLockEntry {
  const parsed = parseFieldKey(fieldKey);
  if (!parsed) {
    throw new Error(`Invalid fieldKey for lock: ${fieldKey}`);
  }
  const root = meta?.root ?? process.cwd();
  const registry = readWorkingLockRegistry({ root });
  const entry: Tier0BLockEntry = {
    fieldKey,
    fieldId: parsed.fieldId,
    formId: parsed.formId,
    lockedAt: new Date().toISOString(),
    lockedBy: meta?.lockedBy,
    reason: meta?.reason,
    source: "manual",
  };
  registry.locks = registry.locks.filter((l) => l.fieldKey !== fieldKey);
  registry.locks.push(entry);
  writeRegistryFile(path.join(stabilityDir(root), WORKING_LOCK_FILE), registry);
  return entry;
}

export function unlockTier0BField(fieldKey: string, options?: { root?: string }): boolean {
  const root = options?.root ?? process.cwd();
  const registry = readWorkingLockRegistry({ root });
  const before = registry.locks.length;
  registry.locks = registry.locks.filter((l) => l.fieldKey !== fieldKey);
  if (registry.locks.length === before) return false;
  writeRegistryFile(path.join(stabilityDir(root), WORKING_LOCK_FILE), registry);
  return true;
}

export function isTier0BLocked(fieldKey: string, options?: { root?: string }): boolean {
  return getEffectiveLocks(options).some((l) => l.fieldKey === fieldKey);
}

export function isTier0BStable(
  fieldKey: string,
  assessment: Pick<TierDriftAssessment, "score" | "trend"> & {
    contractPassed: boolean;
  },
  options?: { root?: string },
): boolean {
  if (isTier0BLocked(fieldKey, options)) return true;
  return (
    assessment.contractPassed &&
    assessment.trend !== "unstable" &&
    assessment.score < TIER0B_DRIFT_DOWNGRADE_THRESHOLD
  );
}

export function exportApprovedLocks(options?: { root?: string }): Tier0BLockRegistry {
  const root = options?.root ?? process.cwd();
  const working = readWorkingLockRegistry({ root });
  const approved = readApprovedLockRegistry({ root });
  const byKey = new Map<string, Tier0BLockEntry>();
  for (const entry of approved.locks) {
    byKey.set(entry.fieldKey, { ...entry, source: "approved_export" });
  }
  for (const entry of working.locks) {
    byKey.set(entry.fieldKey, { ...entry, source: "approved_export" });
  }
  const merged: Tier0BLockRegistry = {
    version: 1,
    updatedAt: new Date().toISOString(),
    locks: [...byKey.values()],
  };
  writeRegistryFile(path.join(stabilityDir(root), APPROVED_LOCK_FILE), merged);
  return merged;
}

export function importApprovedLocks(options?: { root?: string }): Tier0BLockEntry[] {
  return readApprovedLockRegistry(options).locks;
}
