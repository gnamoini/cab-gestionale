/**
 * @advisory v5.3.1 — single truth runtime version (env override dev-only).
 */
import { SELECTOR_BASE_SNAPSHOT_V0 } from "@/lib/selector-core/selector-config-snapshot";

export type VersionResolverPointer = {
  activeVersion: string;
};

let devOverrideWarned = false;

export function resolveEffectiveVersion(pointer: VersionResolverPointer): string {
  if (typeof process !== "undefined") {
    const isDev = process.env.NODE_ENV === "development";
    const envOverride = process.env.NEXT_PUBLIC_SELECTOR_ACTIVE_VERSION?.trim();
    if (isDev && envOverride) {
      if (!devOverrideWarned && typeof console !== "undefined") {
        devOverrideWarned = true;
        console.warn(
          `[selector] NEXT_PUBLIC_SELECTOR_ACTIVE_VERSION override active: ${envOverride}`,
        );
      }
      return envOverride;
    }
  }
  if (pointer.activeVersion?.trim()) return pointer.activeVersion.trim();
  return SELECTOR_BASE_SNAPSHOT_V0.version;
}

/** @deprecated v5.3.1 — use resolveEffectiveVersion */
export function resolveActiveVersion(pointer: VersionResolverPointer): string {
  return resolveEffectiveVersion(pointer);
}

/** Test helper — reset dev-only warning latch. */
export function __resetVersionResolverForTests(): void {
  devOverrideWarned = false;
}
