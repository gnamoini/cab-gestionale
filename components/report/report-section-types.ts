import type { ReportModel } from "@/lib/report/build-report-model";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import type { PartitionedUnifiedKpis } from "@/lib/report/partition-unified-kpi-display";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type {
  TopClienteReportRow,
  TopMezzoReportRow,
  TopRicambioReportRow,
} from "@/lib/report/report-classifiche";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import type { ReportSectionId } from "@/components/report/report-sections-config";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type ReportAnalyticsContext = {
  perf: KpiPerformanceModel | null;
  perfLoading: boolean;
  partitioned: PartitionedUnifiedKpis;
  compareMode: ReportCompareMode;
};

export type DomainReportSectionProps = {
  sectionId: Exclude<ReportSectionId, "analisi_ai">;
  range: DateRange;
  compareRange: DateRange | null;
  rangeKey: string;
  analyticsContext: ReportAnalyticsContext;
  fetchEnabled: boolean;
  anchor: Date;
  compareDetail: ReportCompareDetail | null;
  semanticIndex: ReportSemanticIndex;
  derivedBundle: ReportDerivedBundle;
  attive: LavorazioneAttiva[];
  completate: LavorazioneArchiviata[];
  storico: LavorazioneArchiviata[];
  manualEntries: ReportManualEntryRow[];
  prodotti: RicambioMagazzino[];
  histRev: number;
  onHistRev: () => void;
  topsMezzi: TopMezzoReportRow[];
  topsClienti: TopClienteReportRow[];
  topsRicambi: TopRicambioReportRow[];
  showCompare: boolean;
  manualByMonth: Map<string, number>;
  lavListRows: readonly LavorazioneListRow[];
  magLog: MagazzinoChangeLogEntry[];
  magazzinoRows: MagazzinoRicambioRow[];
  costoOrario: number;
  schedeStore: import("@/types/schede").LavorazioneSchedeStore | null;
  schedeLoaded: boolean;
};

export type ReportAiSectionProps = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
  compareRange: DateRange | null;
  model: ReportModel;
  integrityView: ReportIntegrityBadgeView;
  tops: {
    mezzi: TopMezzoReportRow[];
    clienti: TopClienteReportRow[];
    ricambi: TopRicambioReportRow[];
  };
  snapshotFingerprint: string;
};
