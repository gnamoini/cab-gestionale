"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type {
  EntitySnapshot,
  HealthCheckResult,
  RenameExecutionMode,
  RenameImpact,
  RenameJobStatus,
  RenameMetrics,
  RenamePlan,
  ValidationResult,
} from "@/lib/settings/rename-engine/types";
import { RENAME_ENGINE_VERSION, RENAME_PLAN_VERSION } from "@/lib/settings/rename-engine/constants";

export type SettingsRenameJobRow = {
  id: string;
  correlation_id: string;
  kind: string;
  entity_id: string | null;
  entity_key: string | null;
  old_label: string;
  new_label: string;
  plan_version: number;
  engine_version: string;
  status: RenameJobStatus;
  execution_mode: RenameExecutionMode;
  plan_json: RenamePlan;
  impact_json: RenameImpact | null;
  validation_json: ValidationResult | null;
  metrics_json: RenameMetrics | null;
  entity_snapshot: EntitySnapshot | null;
  health_json: HealthCheckResult | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  parent_job_id: string | null;
  error_message: string | null;
};

async function sb() {
  return getBrowserSupabase();
}

export const settingsRenameJobService = {
  async createJob(input: {
    plan: RenamePlan;
    createdBy: string;
    executionMode?: RenameExecutionMode;
  }): Promise<ServiceResult<SettingsRenameJobRow>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("settings_rename_jobs")
        .insert({
          correlation_id: input.plan.correlationId,
          kind: input.plan.kind,
          entity_id: input.plan.entityId ?? null,
          entity_key: input.plan.entityKey ?? null,
          old_label: input.plan.oldLabel,
          new_label: input.plan.newLabel,
          plan_version: RENAME_PLAN_VERSION,
          engine_version: RENAME_ENGINE_VERSION,
          status: "draft",
          execution_mode: input.executionMode ?? "full",
          plan_json: input.plan,
          created_by: input.createdBy,
        })
        .select("*")
        .single();
      if (error) return err(error.message);
      return success(data as SettingsRenameJobRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async updateJob(
    jobId: string,
    patch: Partial<{
      status: RenameJobStatus;
      impact_json: RenameImpact;
      validation_json: ValidationResult;
      metrics_json: RenameMetrics;
      health_json: HealthCheckResult;
      entity_snapshot: EntitySnapshot;
      error_message: string | null;
      completed_at: string | null;
      execution_mode: RenameExecutionMode;
    }>,
  ): Promise<ServiceResult<void>> {
    try {
      const c = await sb();
      const { error } = await c.from("settings_rename_jobs").update(patch).eq("id", jobId);
      if (error) return err(error.message);
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getJob(jobId: string): Promise<ServiceResult<SettingsRenameJobRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("settings_rename_jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) return err(error.message);
      return success((data as SettingsRenameJobRow | null) ?? null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getLatestForEntity(entityKey: string): Promise<ServiceResult<SettingsRenameJobRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("settings_rename_jobs")
        .select("*")
        .eq("entity_key", entityKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return err(error.message);
      return success((data as SettingsRenameJobRow | null) ?? null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
