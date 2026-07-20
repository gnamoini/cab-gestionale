import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { canonicalMetricIds } from "@/lib/report/datasets/registry";
import type { DatasetBuildResult, DatasetMetricRow } from "@/lib/report/datasets/types";
import {
  countMezziInOfficinaProxy,
  countMezziTotal,
  disponibilitaFlottaPerCliente,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { uniqueClientiNelPeriodo } from "@/lib/report/lavorazioni-report-selectors";

export type ClientiDatasetData = {
  metrics: DatasetMetricRow[];
  ranking?: { clientId: string; clientName: string; disponibilitaPct: number }[];
};

export type ClientiDatasetOptions = {
  includeRanking?: boolean;
};

export function buildClientiDataset(
  ctx: ReportDatasetContext,
  slices: ReportDatasetSlices,
  opts?: ClientiDatasetOptions,
): DatasetBuildResult<ClientiDatasetData> {
  const { integrity, lavRows, range } = slices;
  const clienti = uniqueClientiNelPeriodo(
    integrity.attive,
    integrity.storico,
    integrity.completate,
    range,
  );
  const flottaOfficina = countMezziInOfficinaProxy(integrity.mezzi, lavRows);
  const mezziTotal = countMezziTotal(integrity.mezzi);

  const metrics: DatasetMetricRow[] = [
    { id: "clienti", value: clienti, label: "Clienti nel periodo" },
    { id: "flotta-officina", value: flottaOfficina, label: "Mezzi in officina" },
    { id: "mezzi", value: mezziTotal, label: "Mezzi in anagrafica" },
  ];

  let ranking: ClientiDatasetData["ranking"];
  if (opts?.includeRanking) {
    const rows = disponibilitaFlottaPerCliente(integrity.mezzi, lavRows);
    ranking = rows.slice(0, 10).map((r) => ({
      clientId: r.cliente,
      clientName: r.cliente,
      disponibilitaPct: r.disponibilitaPct ?? 0,
    }));
  }

  void ctx;

  return {
    data: { metrics, ranking },
    metricIds: canonicalMetricIds(metrics.map((m) => m.id)),
  };
}
