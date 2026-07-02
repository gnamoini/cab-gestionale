import {
  readAssetLifecycleV1FromRows,
  resolveAssetLifecycleV1Flags,
  type AssetLifecycleV1Flags,
} from "@/lib/officina/asset-lifecycle-v1-flag";

let cachedFlags: AssetLifecycleV1Flags | null = null;

/** Imposta cache da app settings rows (layout/dashboard bootstrap). */
export function seedAssetLifecycleV1Flags(rows: Parameters<typeof readAssetLifecycleV1FromRows>[0]): void {
  cachedFlags = resolveAssetLifecycleV1Flags(readAssetLifecycleV1FromRows(rows));
}

export function resolveAssetLifecycleV1EnabledClient(dbRows?: Parameters<typeof readAssetLifecycleV1FromRows>[0]): AssetLifecycleV1Flags {
  if (dbRows) {
    cachedFlags = resolveAssetLifecycleV1Flags(readAssetLifecycleV1FromRows(dbRows));
    return cachedFlags;
  }
  return cachedFlags ?? resolveAssetLifecycleV1Flags(null);
}
