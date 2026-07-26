"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";
import { previewRenameImpact } from "@/lib/settings/rename-engine/rename-impact-preview";
import { validateRenamePlan } from "@/lib/settings/rename-engine/rename-validate";
import {
  configurationOnlyHealth,
  validateRenameConsistency,
} from "@/lib/settings/rename-engine/rename-health-check";
import { shouldQueueRename } from "@/lib/settings/rename-engine/rename-execution-policy";
import type {
  EntitySnapshot,
  HealthCheckResult,
  RenameExecutionMode,
  RenameImpact,
  RenameMetrics,
  RenamePlan,
  ValidationResult,
} from "@/lib/settings/rename-engine/types";
import { settingsRenamePropagationService } from "@/src/services/settings-rename-propagation.service";
import { settingsRenameJobService } from "@/src/services/settings-rename-job.service";

function planToEntry(plan: RenamePlan): SettingsRenameEntry {
  return { kind: plan.kind, from: plan.oldLabel, to: plan.newLabel };
}

export const settingsRenameEngineService = {
  buildRenamePlan,

  async previewRename(
    plan: RenamePlan,
    context: { existingLabels: readonly string[] },
  ): Promise<ServiceResult<{ impact: RenameImpact; validation: ValidationResult }>> {
    try {
      const c = await getBrowserSupabase();
      const impact = await previewRenameImpact(c, plan);
      const validation = validateRenamePlan(plan, { existingLabels: context.existingLabels });
      return success({ impact, validation });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async runRenameJob(input: {
    plan: RenamePlan;
    userId: string;
    executionMode: RenameExecutionMode;
    existingLabels: readonly string[];
    propagate: boolean;
  }): Promise<
    ServiceResult<{
      jobId?: string;
      impact?: RenameImpact;
      validation?: ValidationResult;
      health?: HealthCheckResult;
      metrics?: RenameMetrics;
      queued?: boolean;
      propagationResults?: Awaited<ReturnType<typeof settingsRenamePropagationService.propagateRenames>>["data"];
    }>
  > {
    const started = Date.now();
    try {
      const previewRes = await this.previewRename(input.plan, { existingLabels: input.existingLabels });
      if (!previewRes.success || !previewRes.data) return err(previewRes.error ?? "Preview fallita");
      const { impact, validation } = previewRes.data;
      if (validation.status === "blocked") {
        return err(validation.checks.map((c: { message?: string }) => c.message).filter(Boolean).join(" ") || "Conflitto rename");
      }

      const jobRes = await settingsRenameJobService.createJob({
        plan: input.plan,
        createdBy: input.userId,
        executionMode: input.executionMode,
      });
      const jobId = jobRes.success && jobRes.data ? jobRes.data.id : undefined;

      if (jobId) {
        await settingsRenameJobService.updateJob(jobId, {
          status: "previewed",
          impact_json: impact,
          validation_json: validation,
        });
        await settingsRenameJobService.updateJob(jobId, { status: "validated" });
      }

      if (!input.propagate || input.executionMode === "configuration_only") {
        const health = configurationOnlyHealth();
        const metrics: RenameMetrics = {
          kind: input.plan.kind,
          entity_id: input.plan.entityId,
          entity_key: input.plan.entityKey,
          entity: input.plan.newLabel,
          records_scanned: impact.totalScanned,
          records_updated: 0,
          records_protected: impact.totalProtected,
          duration_ms: Date.now() - started,
          warnings: 1,
          execution_mode: "configuration_only",
          batched: false,
        };
        if (jobId) {
          await settingsRenameJobService.updateJob(jobId, {
            status: "completed",
            health_json: health,
            metrics_json: metrics,
            completed_at: new Date().toISOString(),
          });
        }
        return success({ jobId, impact, validation, health, metrics });
      }

      const queued = shouldQueueRename(impact);
      if (jobId) {
        await settingsRenameJobService.updateJob(jobId, { status: queued ? "queued" : "approved" });
      }

      const c = await getBrowserSupabase();
      if (jobId) {
        try {
          await c.rpc("execute_rename_job_start", { p_job_id: jobId, p_actor: input.userId });
        } catch {
          await settingsRenameJobService.updateJob(jobId, { status: "running" });
        }
      }

      const propRes = await settingsRenamePropagationService.propagateRenames([planToEntry(input.plan)]);
      if (!propRes.success) {
        if (jobId) {
          await settingsRenameJobService.updateJob(jobId, {
            status: "failed",
            error_message: propRes.error ?? "Propagazione fallita",
          });
        }
        return err(propRes.error ?? "Propagazione fallita");
      }

      const recordsUpdated = (propRes.data ?? []).reduce((s, r) => s + r.updated, 0);
      const health = validateRenameConsistency({
        plan: input.plan,
        impact,
        oldLabelResiduals: {},
        newLabelCounts: {},
        aliasRegistered: true,
        entityKeyUnchanged: true,
      });

      const entitySnapshot: EntitySnapshot = {
        entity_id: input.plan.entityId,
        entity_key: input.plan.entityKey,
        before: { nome_display: input.plan.oldLabel },
        after: { nome_display: input.plan.newLabel, alias: [input.plan.oldLabel] },
      };

      const metrics: RenameMetrics = {
        kind: input.plan.kind,
        entity_id: input.plan.entityId,
        entity_key: input.plan.entityKey,
        entity: input.plan.newLabel,
        records_scanned: impact.totalScanned,
        records_updated: recordsUpdated,
        records_protected: impact.totalProtected,
        duration_ms: Date.now() - started,
        warnings: health.status === "warning" ? 1 : 0,
        execution_mode: "full",
        batched: queued,
      };

      if (jobId) {
        await settingsRenameJobService.updateJob(jobId, {
          status: "completed",
          health_json: health,
          metrics_json: metrics,
          entity_snapshot: entitySnapshot,
          completed_at: new Date().toISOString(),
        });

        try {
          await c.rpc("execute_rename_job_complete", {
            p_job_id: jobId,
            p_metrics: metrics,
            p_health: health,
            p_entity_snapshot: entitySnapshot,
          });
        } catch {
          /* job già aggiornato client-side */
        }
      }

      return success({
        jobId,
        impact,
        validation,
        health,
        metrics,
        queued,
        propagationResults: propRes.data,
      });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
