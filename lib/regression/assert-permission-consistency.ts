/* eslint-disable @next/next/no-assign-module-variable -- lint phase2: dynamic import interop requires module handle */
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

/** Ogni modulo canonico deve esistere nello snapshot (anti-drift moduli). */
export function assertPermissionConsistency(snapshot: EffectivePermissionsSnapshot): void {
  for (const module of GESTIONALE_PERMISSION_MODULES) {
    const perm = snapshot.modules[module];
    if (!perm) {
      throw new Error(`assertPermissionConsistency: missing module "${module}" in snapshot`);
    }
    if (typeof perm.canRead !== "boolean" || typeof perm.canWrite !== "boolean") {
      throw new Error(`assertPermissionConsistency: invalid shape for module "${module}"`);
    }
  }
}
