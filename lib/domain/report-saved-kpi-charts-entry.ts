"use client";

import { reportSavedKpiChartsService } from "@/src/services/report-saved-kpi-charts.service";

export const reportSavedKpiChartsEntry = {
  list: reportSavedKpiChartsService.list.bind(reportSavedKpiChartsService),
  create: reportSavedKpiChartsService.create.bind(reportSavedKpiChartsService),
  update: reportSavedKpiChartsService.update.bind(reportSavedKpiChartsService),
  delete: reportSavedKpiChartsService.delete.bind(reportSavedKpiChartsService),
  bulkCreate: reportSavedKpiChartsService.bulkCreate.bind(reportSavedKpiChartsService),
};

export type {
  CreateSavedKpiChartInput,
  SavedKpiChart,
  UpdateSavedKpiChartInput,
} from "@/lib/report/kpi-chart-config/contracts";
