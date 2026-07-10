import { resolveCatalogReference } from "./catalog";
import { resolveControlMode } from "./control-mode";
import { CONTROL_CONTRACT_VERSION, CONTROL_REGISTRY_VERSION } from "./contract";
import { sortControlsByDependencies } from "./graph";
import { CONTROL_REGISTRY, controlsForTier } from "./registry";
import type {
  ControlDefinition,
  ControlExecutionContext,
  ControlOutcome,
  ControlReport,
  ControlResult,
  ControlTier,
} from "./types";

const LOCAL_SKIP_IDS = new Set([
  "runtime.e2e.smoke",
  "data.supabase.connection",
  "data.production.readiness",
  "data.publication.sanity",
]);

function smokePlaywrightSkip(): boolean {
  if (process.env.SMOKE_SKIP === "1") return true;
  return !(
    process.env.SMOKE_ADMIN_EMAIL?.trim() &&
    process.env.SMOKE_ADMIN_PASSWORD?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  );
}

function hasSupabaseSecrets(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createExecutionContext(
  tier: ControlTier,
  partial?: Partial<ControlExecutionContext>,
): ControlExecutionContext {
  return {
    runId: partial?.runId ?? process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`,
    commitSha: partial?.commitSha ?? process.env.GITHUB_SHA ?? "local",
    tier,
    attempt: partial?.attempt ?? Number(process.env.CONTROL_ATTEMPT ?? "1"),
    timestamp: partial?.timestamp ?? new Date().toISOString(),
  };
}

function shouldSkipForLocal(control: ControlDefinition): boolean {
  if (LOCAL_SKIP_IDS.has(control.id)) return true;
  if (control.id === "runtime.e2e.smoke" && smokePlaywrightSkip()) return true;
  if (control.id === "runtime.smoke.preflight" && process.env.SMOKE_SKIP === "1") return true;
  if (
    (control.id === "data.supabase.connection" || control.id === "data.production.readiness") &&
    !hasSupabaseSecrets()
  ) {
    return true;
  }
  return false;
}

function outcomeFromUpstream(upstream: ControlOutcome): ControlOutcome {
  if (upstream === "fail") return "blocked";
  if (upstream === "unknown") return "blocked";
  return "blocked";
}

function mapCatalogToOutcome(
  control: ControlDefinition,
  catalogResult: ReturnType<NonNullable<ReturnType<typeof resolveCatalogReference>>["resolve"]>,
): ControlOutcome {
  if (catalogResult.unknown) return "unknown";
  if (catalogResult.ok) return "pass";
  if (control.severity === "warning" || control.severity === "info") return "warning";
  if (control.status === "experimental") return "warning";
  return "fail";
}

function isTierBlocking(outcome: ControlOutcome, control: ControlDefinition): boolean {
  if (outcome === "fail") return control.severity === "blocker";
  if (outcome === "unknown") {
    return control.severity === "blocker" && control.tier !== "pr";
  }
  return false;
}

export function selectControlsForTier(tier: ControlTier): ControlDefinition[] {
  if (tier === "local") {
    return sortControlsByDependencies(
      CONTROL_REGISTRY.filter(
        (c) =>
          c.tier === "pr" &&
          c.status !== "sunset" &&
          c.status !== "disabled" &&
          !shouldSkipForLocal(c),
      ),
    );
  }
  return sortControlsByDependencies(controlsForTier(tier));
}

export function runTier(
  tier: ControlTier,
  context?: Partial<ControlExecutionContext>,
): ControlReport {
  const ctx = createExecutionContext(tier, context);
  const controls = selectControlsForTier(tier);
  const results: ControlResult[] = [];
  const outcomes = new Map<string, ControlOutcome>();

  for (const control of controls) {
    const started = Date.now();

    if (control.status === "sunset" || control.status === "disabled") {
      const outcome: ControlOutcome = "skipped";
      outcomes.set(control.id, outcome);
      results.push({
        runId: ctx.runId,
        attempt: ctx.attempt,
        controlId: control.id,
        outcome,
        durationMs: 0,
        reason: `status=${control.status}`,
      });
      continue;
    }

    const blockedDep = (control.dependsOn ?? []).find((dep) => {
      const o = outcomes.get(dep);
      return o && o !== "pass" && o !== "warning";
    });
    if (blockedDep) {
      const upstream = outcomes.get(blockedDep)!;
      const outcome = outcomeFromUpstream(upstream);
      outcomes.set(control.id, outcome);
      results.push({
        runId: ctx.runId,
        attempt: ctx.attempt,
        controlId: control.id,
        outcome,
        durationMs: 0,
        reason: `blocked by ${blockedDep} (${upstream})`,
      });
      continue;
    }

    const ref = control.implementation.reference;
    const entry = resolveCatalogReference(ref);
    if (!entry) {
      const outcome: ControlOutcome = "unknown";
      outcomes.set(control.id, outcome);
      results.push({
        runId: ctx.runId,
        attempt: ctx.attempt,
        controlId: control.id,
        outcome,
        durationMs: Date.now() - started,
        reason: `missing catalog entry: ${ref}`,
      });
      continue;
    }

    const catalogResult = entry.resolve();
    const outcome = mapCatalogToOutcome(control, catalogResult);
    outcomes.set(control.id, outcome);

    const result: ControlResult = {
      runId: ctx.runId,
      attempt: ctx.attempt,
      controlId: control.id,
      outcome,
      durationMs: Date.now() - started,
    };
    if (catalogResult.unknownReason) result.reason = catalogResult.unknownReason;
    if (catalogResult.blockers.length) result.blockers = catalogResult.blockers;
    if (catalogResult.warnings.length) result.warnings = catalogResult.warnings;
    if (control.status === "deprecated") {
      result.warnings = [...(result.warnings ?? []), `deprecated; sunset ${control.sunsetDate ?? "TBD"}`];
    }
    results.push(result);
  }

  const summary = {
    pass: results.filter((r) => r.outcome === "pass").length,
    fail: results.filter((r) => r.outcome === "fail").length,
    warning: results.filter((r) => r.outcome === "warning").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    unknown: results.filter((r) => r.outcome === "unknown").length,
    blocked: results.filter((r) => r.outcome === "blocked").length,
  };

  const blockers = results.filter((r) => {
    const control = CONTROL_REGISTRY.find((c) => c.id === r.controlId);
    return control && isTierBlocking(r.outcome, control);
  }).length;

  return {
    controlContractVersion: CONTROL_CONTRACT_VERSION,
    controlRegistryVersion: CONTROL_REGISTRY_VERSION,
    context: ctx,
    tier,
    controlMode: resolveControlMode(),
    results,
    summary,
    blockers,
  };
}

export function reportExitCode(report: ControlReport): number {
  return report.blockers > 0 ? 1 : 0;
}
