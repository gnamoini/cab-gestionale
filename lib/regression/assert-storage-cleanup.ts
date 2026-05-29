import type { ServiceResult } from "@/src/services/service-result";

/** Esito purge/delete storage: success obbligatorio in smoke/regression. */
export function assertStorageCleanup(result: ServiceResult<unknown>): void {
  if (!result.success) {
    throw new Error(`assertStorageCleanup: expected success, got error="${result.error ?? "unknown"}"`);
  }
}
