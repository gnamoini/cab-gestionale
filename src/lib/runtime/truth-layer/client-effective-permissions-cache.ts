"use client";

import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

/** Snapshot pubblicato da `useEffectivePermissions` per guard async allineati all'hook UI. */
let publishedSnapshot: EffectivePermissionsSnapshot | null = null;

/** Ruolo auth in memoria (non sessionStorage — evita hint client-writable). */
let authRoleHint: { userId: string; ruolo: string } | null = null;

export function publishClientEffectivePermissionsSnapshot(
  snapshot: EffectivePermissionsSnapshot | null,
): void {
  publishedSnapshot = snapshot;
}

export function readClientEffectivePermissionsSnapshotCache(): EffectivePermissionsSnapshot | null {
  return publishedSnapshot;
}

export function clearClientEffectivePermissionsSnapshotCache(): void {
  publishedSnapshot = null;
  clearAuthRoleHint();
}

/** Ruolo auth noto in memoria per guard async quando il profilo non è ancora risolto. */
export function publishAuthRoleHint(userId: string, ruolo: string): void {
  authRoleHint = { userId, ruolo };
}

export function readAuthRoleHint(): { userId: string; ruolo: string } | null {
  return authRoleHint;
}

export function clearAuthRoleHint(): void {
  authRoleHint = null;
}
