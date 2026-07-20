import type { ReportSectionId } from "@/components/report/report-sections-config";

export type ReportSectionLazyMode = "keep-mounted" | "unmount-on-close";

export const REPORT_SECTION_UI: Record<ReportSectionId, { lazyMode: ReportSectionLazyMode }> = {
  analisi_ai: { lazyMode: "keep-mounted" },
  lavorazioni: { lazyMode: "unmount-on-close" },
  clienti_mezzi: { lazyMode: "unmount-on-close" },
  magazzino_ricambi: { lazyMode: "unmount-on-close" },
  ore_lavorate: { lazyMode: "unmount-on-close" },
  dati_economici: { lazyMode: "keep-mounted" },
  analisi_incrociate: { lazyMode: "keep-mounted" },
};
