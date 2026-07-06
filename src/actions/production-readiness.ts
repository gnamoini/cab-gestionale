"use server";

import { fetchProductionReadinessDbSnapshot } from "@/lib/production/fetch-production-readiness-db";
import { validateProductionReadiness } from "@/lib/production/production-readiness";
import { scanProductionReadinessCode } from "@/lib/production/production-readiness-scan";
import type { ProductionReadinessResult } from "@/lib/production/production-readiness-types";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export type RunProductionReadinessResult =
  | { ok: true; report: ProductionReadinessResult }
  | { ok: false; message: string };

/** Solo admin / manageSecurity. */
export async function runProductionReadinessCheckAction(): Promise<RunProductionReadinessResult> {
  const allowed = await verifyServerPageWrite("sicurezza");
  if (!allowed) {
    return { ok: false, message: "Accesso riservato agli amministratori." };
  }

  const db = await fetchProductionReadinessDbSnapshot();
  const report = validateProductionReadiness({
    codeScan: scanProductionReadinessCode(),
    db,
    requireDb: false,
  });

  return { ok: true, report };
}
