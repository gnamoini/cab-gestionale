import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { ReportIntegrityResult } from "@/lib/report/report-data-integrity-layer";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type {
  DdtDocumentRow,
  InvoicePaymentRow,
  InvoiceRow,
  MagazzinoRicambioRow,
} from "@/src/types/supabase-tables";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { AnalyticsDataRequirements } from "@/lib/report/analytics-engine/resolve-analytics-data-requirements";

export type ReportAnalyticsSourceBundle = {
  period: ReportRequestedPeriod;
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
  rangeKey: string;
  requirements: AnalyticsDataRequirements;
  integrity: ReportIntegrityResult;
  lavRows: readonly LavorazioneListRow[];
  magazzinoRows: readonly MagazzinoRicambioRow[];
  preventivi: readonly PreventivoRecord[];
  invoices: readonly InvoiceRow[];
  invoicePayments: readonly InvoicePaymentRow[];
  ddtDocuments: readonly DdtDocumentRow[];
  ordini: readonly OrdineFornitoreRecord[];
  totalHours: number;
  timesheetEntries: readonly DipendenteTimesheetEntryRow[];
  timesheetEmployees: readonly DipendenteTimesheetEmployeeRow[];
  schedeStore: LavorazioneSchedeStore | null;
  costoOrario: number;
  invoicesAvailable: boolean;
  ddtAvailable: boolean;
  ordiniAvailable: boolean;
  /** Audit: which enrich paths ran (source parity tests). */
  loadedSlices: ReadonlySet<keyof AnalyticsDataRequirements>;
};
