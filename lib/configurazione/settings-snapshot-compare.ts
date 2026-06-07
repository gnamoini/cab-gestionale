import type { ConfigurazioneSettingsSnapshot } from "@/lib/configurazione/settings-snapshot-log";
import { buildResolvedFromModalSnapshot } from "@/lib/configurazione/settings-workspace-snapshot";
import { buildBulkRowsFromResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keysA = Object.keys(ao).sort();
    const keysB = Object.keys(bo).sort();
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k, i) => keysB[i] === k && deepEqual(ao[k], bo[k]));
  }
  return false;
}

function bulkRowsForCompare(s: ConfigurazioneSettingsSnapshot) {
  return buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(s)).map((row) => {
    if (row.module === CAB_SETTINGS_MODULE.system && row.key === CAB_SETTINGS_KEY.branding) {
      const value = { ...(row.value as Record<string, unknown>) };
      delete value.updatedAt;
      return { ...row, value };
    }
    return row;
  });
}

/** Confronto strutturale equivalente al payload bulk save (6 righe app_settings). */
export function areConfigurazioneSnapshotsEqual(
  a: ConfigurazioneSettingsSnapshot,
  b: ConfigurazioneSettingsSnapshot,
): boolean {
  const rowsA = bulkRowsForCompare(a);
  const rowsB = bulkRowsForCompare(b);
  if (rowsA.length !== rowsB.length) return false;
  for (let i = 0; i < rowsA.length; i++) {
    const ra = rowsA[i]!;
    const rb = rowsB[i]!;
    if (ra.module !== rb.module || ra.key !== rb.key) return false;
    if (!deepEqual(ra.value, rb.value)) return false;
  }
  return true;
}
