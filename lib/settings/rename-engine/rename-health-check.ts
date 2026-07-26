import type {
  HealthCheckResult,
  HealthCheckStatus,
  RenameImpact,
  RenamePlan,
} from "@/lib/settings/rename-engine/types";

function aggregateStatus(checks: HealthCheckResult["checks"]): HealthCheckStatus {
  if (checks.some((c) => c.status === "failed")) return "failed";
  if (checks.some((c) => c.status === "warning")) return "warning";
  return "healthy";
}

export function validateRenameConsistency(input: {
  plan: RenamePlan;
  impact: RenameImpact;
  oldLabelResiduals: Record<string, number>;
  newLabelCounts: Record<string, number>;
  aliasRegistered?: boolean;
  entityKeyUnchanged?: boolean;
  extraWarnings?: Array<{ name: string; message: string }>;
}): HealthCheckResult {
  const checks: HealthCheckResult["checks"] = [];

  for (const item of input.impact.items) {
    if (item.policy !== "live" || item.updatable === 0) continue;
    const residual = input.oldLabelResiduals[item.operationId] ?? 0;
    checks.push({
      name: `${item.operationId}_no_old_label`,
      status: residual === 0 ? "healthy" : "failed",
      expected: 0,
      actual: residual,
      message: residual > 0 ? `${residual} record con vecchio valore` : undefined,
    });
    const actual = input.newLabelCounts[item.operationId] ?? 0;
    checks.push({
      name: `${item.operationId}_parity`,
      status: actual === item.updatable ? "healthy" : "failed",
      expected: item.updatable,
      actual,
    });
  }

  if (input.aliasRegistered === false) {
    checks.push({
      name: "alias_registered",
      status: "warning",
      message: "Alias storico non registrato",
    });
  }

  if (input.entityKeyUnchanged === false) {
    checks.push({
      name: "entity_key_unchanged",
      status: "failed",
      message: "entity_key non deve cambiare su rename",
    });
  }

  for (const w of input.extraWarnings ?? []) {
    checks.push({ name: w.name, status: "warning", message: w.message });
  }

  return { status: aggregateStatus(checks), checks };
}

export function configurationOnlyHealth(): HealthCheckResult {
  return {
    status: "warning",
    checks: [
      {
        name: "live_data_skipped",
        status: "warning",
        message: "Record operativi non aggiornati (solo configurazione)",
      },
    ],
  };
}
