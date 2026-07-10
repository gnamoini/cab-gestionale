"use client";

import { REPORT_SAVED_KPI_CHARTS_COLUMNS } from "@/lib/db/table-select-columns";
import {
  KPI_CHART_CONFIG_SCHEMA_VERSION,
  type CreateSavedKpiChartInput,
  type ReportSavedKpiChartRow,
  type UpdateSavedKpiChartInput,
} from "@/lib/report/kpi-chart-config/contracts";
import { serializeKpiChartConfigBody } from "@/lib/report/kpi-chart-config/validation";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { ReportSavedKpiChartRow as DbRow } from "@/src/types/supabase-tables";

const TABLE = "report_saved_kpi_charts";

async function sb() {
  return getBrowserSupabase();
}

function mapRow(data: Record<string, unknown>): ReportSavedKpiChartRow {
  const row = data as DbRow;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    config: row.config as ReportSavedKpiChartRow["config"],
    schema_version: row.schema_version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const reportSavedKpiChartsRepository = {
  async listByUser(): Promise<ReportSavedKpiChartRow[]> {
    const c = await sb();
    const { data, error } = await c
      .from(TABLE)
      .select(REPORT_SAVED_KPI_CHARTS_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async countByUser(): Promise<number> {
    const c = await sb();
    const { count, error } = await c.from(TABLE).select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async insert(userId: string, input: CreateSavedKpiChartInput): Promise<ReportSavedKpiChartRow> {
    const c = await sb();
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      user_id: userId,
      name: input.name,
      config: serializeKpiChartConfigBody(input.config),
      schema_version: KPI_CHART_CONFIG_SCHEMA_VERSION,
    };
    const { data, error } = await c.from(TABLE).insert(payload).select(REPORT_SAVED_KPI_CHARTS_COLUMNS).single();
    if (error) throw new Error(error.message);
    return mapRow(data as Record<string, unknown>);
  },

  async update(input: UpdateSavedKpiChartInput): Promise<ReportSavedKpiChartRow> {
    const c = await sb();
    const patch: Record<string, unknown> = {};
    if (input.name != null) patch.name = input.name;
    if (input.config != null) patch.config = serializeKpiChartConfigBody(input.config);
    const { data, error } = await c
      .from(TABLE)
      .update(patch)
      .eq("id", input.id)
      .select(REPORT_SAVED_KPI_CHARTS_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const c = await sb();
    const { error } = await c.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async bulkInsert(userId: string, inputs: CreateSavedKpiChartInput[]): Promise<ReportSavedKpiChartRow[]> {
    if (inputs.length === 0) return [];
    const c = await sb();
    const rows = inputs.map((input) => ({
      ...(input.id ? { id: input.id } : {}),
      user_id: userId,
      name: input.name,
      config: serializeKpiChartConfigBody(input.config),
      schema_version: KPI_CHART_CONFIG_SCHEMA_VERSION,
    }));
    const { data, error } = await c.from(TABLE).insert(rows).select(REPORT_SAVED_KPI_CHARTS_COLUMNS);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },
};
