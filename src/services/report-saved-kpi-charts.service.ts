"use client";

import type {
  CreateSavedKpiChartInput,
  SavedKpiChart,
  UpdateSavedKpiChartInput,
} from "@/lib/report/kpi-chart-config/contracts";
import { mapRowsToSavedCharts } from "@/lib/report/kpi-chart-config/mapper";
import {
  assertCanAddSavedCharts,
  MAX_SAVED_KPI_CHARTS_PER_USER,
  normalizeChartName,
  parseKpiChartConfigBody,
  validateChartName,
} from "@/lib/report/kpi-chart-config/validation";
import { reportSavedKpiChartsRepository } from "@/src/repositories/report-saved-kpi-charts.repository";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

function rejectIfAtLimit(currentCount: number, adding: number): ServiceResult<never> | null {
  const msg = assertCanAddSavedCharts(currentCount, adding);
  if (msg) return err(msg);
  return null;
}

export { MAX_SAVED_KPI_CHARTS_PER_USER };

export const reportSavedKpiChartsService = {
  async list(): Promise<ServiceResult<SavedKpiChart[]>> {
    try {
      const rows = await reportSavedKpiChartsRepository.listByUser();
      return success(mapRowsToSavedCharts(rows));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(userId: string, input: CreateSavedKpiChartInput): Promise<ServiceResult<SavedKpiChart>> {
    try {
      const nameErr = validateChartName(input.name);
      if (nameErr) return err(nameErr);
      if (!parseKpiChartConfigBody(input.config)) return err("Configurazione grafico non valida.");

      const count = await reportSavedKpiChartsRepository.countByUser();
      const limitErr = rejectIfAtLimit(count, 1);
      if (limitErr) return limitErr;

      const row = await reportSavedKpiChartsRepository.insert(userId, {
        ...input,
        name: normalizeChartName(input.name),
      });
      const chart = mapRowsToSavedCharts([row])[0];
      if (!chart) return err("Configurazione grafico non valida.");
      return success(chart);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(input: UpdateSavedKpiChartInput): Promise<ServiceResult<SavedKpiChart>> {
    try {
      if (input.name != null) {
        const nameErr = validateChartName(input.name);
        if (nameErr) return err(nameErr);
      }
      if (input.config != null && !parseKpiChartConfigBody(input.config)) {
        return err("Configurazione grafico non valida.");
      }

      const row = await reportSavedKpiChartsRepository.update({
        ...input,
        name: input.name != null ? normalizeChartName(input.name) : undefined,
      });
      const chart = mapRowsToSavedCharts([row])[0];
      if (!chart) return err("Configurazione grafico non valida.");
      return success(chart);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      await reportSavedKpiChartsRepository.delete(id);
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async bulkCreate(userId: string, inputs: CreateSavedKpiChartInput[]): Promise<ServiceResult<SavedKpiChart[]>> {
    try {
      if (inputs.length === 0) return success([]);

      const valid: CreateSavedKpiChartInput[] = [];
      for (const input of inputs) {
        const nameErr = validateChartName(input.name);
        if (nameErr) continue;
        if (!parseKpiChartConfigBody(input.config)) continue;
        valid.push({ ...input, name: normalizeChartName(input.name) });
      }
      if (valid.length === 0) return err("Nessuna configurazione locale valida da importare.");

      const count = await reportSavedKpiChartsRepository.countByUser();
      const limitErr = rejectIfAtLimit(count, valid.length);
      if (limitErr) return limitErr;

      const rows = await reportSavedKpiChartsRepository.bulkInsert(userId, valid);
      return success(mapRowsToSavedCharts(rows));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
