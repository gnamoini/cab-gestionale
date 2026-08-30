"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type {
  EntitySnapshot,
  HealthCheckResult,
  PropagationStatus,
  RenameExecutionMode,
  RenameImpact,
  RenameJobSource,
  RenameMetrics,
  RenamePlan,
  ValidationResult,
} from "@/lib/settings/rename-engine/types";
import { RENAME_ENGINE_VERSION, RENAME_PLAN_VERSION } from "@/lib/settings/rename-engine/constants";
import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";

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
  status: import("@/lib/settings/rename-engine/types").RenameJobStatus;
  execution_mode: RenameExecutionMode;
  propagation_status: PropagationStatus | null;
  source: RenameJobSource;
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

const SETTINGS_RENAME_JOB_COLUMNS =
  "id,correlation_id,kind,entity_id,entity_key,old_label,new_label,plan_version,engine_version,status,execution_mode,propagation_status,source,plan_json,impact_json,validation_json,metrics_json,entity_snapshot,health_json,created_by,created_at,completed_at,parent_job_id,error_message" as const;

export type SettingsRenameJobDetailRow = {
  id: string;
  job_id: string;
  table_name: string;
  record_id: string;
  old_value: string | null;
  new_value: string | null;
  affected_rows: number;
  execution_id: string | null;
  operation_id: string | null;
  created_at: string;
};

async function sb() {
  return getBrowserSupabase();
}

export const settingsRenameJobService = {
  async createJob(input: {
    plan: RenamePlan;
    createdBy: string;
    executionMode?: RenameExecutionMode;
    propagationStatus?: PropagationStatus;
    source?: RenameJobSource;
    parentJobId?: string | null;
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
          propagation_status: input.propagationStatus ?? "pending_propagation",
          source: input.source ?? "user_rename",
          plan_json: input.plan,
          parent_job_id: input.parentJobId ?? null,
          created_by: input.createdBy,
        })
        .select(SETTINGS_RENAME_JOB_COLUMNS)
        .single();
      if (error) return err(error.message);
      return success(data as SettingsRenameJobRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async createPendingJobs(input: {
    plans: RenamePlan[];
    createdBy: string;
  }): Promise<ServiceResult<SettingsRenameJobRow[]>> {
    const rows: SettingsRenameJobRow[] = [];
    for (const plan of input.plans) {
      const res = await this.createJob({
        plan,
        createdBy: input.createdBy,
        executionMode: "full",
        propagationStatus: "pending_propagation",
        source: "user_rename",
      });
      if (!res.success || !res.data) return err(res.error ?? "Creazione job pendente fallita");
      rows.push(res.data);
    }
    return success(rows);
  },

  async updateJob(
    jobId: string,
    patch: Partial<{
      status: SettingsRenameJobRow["status"];
      impact_json: RenameImpact;
      validation_json: ValidationResult;
      metrics_json: RenameMetrics;
      health_json: HealthCheckResult;
      entity_snapshot: EntitySnapshot;
      error_message: string | null;
      completed_at: string | null;
      execution_mode: RenameExecutionMode;
      propagation_status: PropagationStatus;
      source: RenameJobSource;
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

  async insertJobDetails(
    jobId: string,
    executionId: string,
    details: ReadonlyArray<{
      table_name: string;
      operation_id: string;
      old_value: string;
      new_value: string;
      affected_rows: number;
    }>,
  ): Promise<ServiceResult<void>> {
    if (!details.length) return success(undefined);
    try {
      const c = await sb();
      const { error } = await c.from("settings_rename_job_details").insert(
        details.map((d) => ({
          job_id: jobId,
          table_name: d.table_name,
          record_id: `${d.operation_id}:${d.table_name}`,
          old_value: d.old_value,
          new_value: d.new_value,
          affected_rows: d.affected_rows,
          execution_id: executionId,
          operation_id: d.operation_id,
        })),
      );
      if (error) return err(error.message);
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getJob(jobId: string): Promise<ServiceResult<SettingsRenameJobRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("settings_rename_jobs")
        .select(SETTINGS_RENAME_JOB_COLUMNS)
        .eq("id", jobId)
        .maybeSingle();
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
        .select(SETTINGS_RENAME_JOB_COLUMNS)
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

  async listRecentJobs(limit = 50): Promise<ServiceResult<SettingsRenameJobRow[]>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("settings_rename_jobs")
        .select(SETTINGS_RENAME_JOB_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return err(error.message);
      return success((data ?? []) as SettingsRenameJobRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listPendingOrDriftJobs(kind?: SettingsRenameKind): Promise<ServiceResult<SettingsRenameJobRow[]>> {
    try {
      const c = await sb();
      let q = c
        .from("settings_rename_jobs")
        .select(SETTINGS_RENAME_JOB_COLUMNS)
        .in("propagation_status", ["pending_propagation", "configuration_only"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as SettingsRenameJobRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async findPendingJob(input: {
    kind: SettingsRenameKind;
    oldLabel: string;
    newLabel: string;
  }): Promise<ServiceResult<SettingsRenameJobRow | null>> {
    try {
      const c = await sb();
      const { data, error } = await c
        .from("settings_rename_jobs")
        .select(SETTINGS_RENAME_JOB_COLUMNS)
        .eq("kind", input.kind)
        .eq("old_label", input.oldLabel)
        .eq("new_label", input.newLabel)
        .in("propagation_status", ["pending_propagation", "configuration_only"])
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
