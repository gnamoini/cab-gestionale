import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { ReportIntegrityResult } from "@/lib/report/report-data-integrity-layer";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DdtDocumentRow, InvoiceRow, MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";

export type ReportDatasetSlices = {
  integrity: ReportIntegrityResult;
  lavRows: readonly LavorazioneListRow[];
  magazzinoRows: readonly MagazzinoRicambioRow[];
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
  rangeKey: string;
  preventivi?: readonly PreventivoRecord[];
  invoices?: readonly InvoiceRow[];
  ddtDocuments?: readonly DdtDocumentRow[];
  ordini?: readonly OrdineFornitoreRecord[];
  totalHours?: number;
  schedeStore?: LavorazioneSchedeStore | null;
  costoOrario?: number;
  invoicesAvailable?: boolean;
};

export const ECO_FATTURATO_SOURCE_PENDING = "eco_fatturato_source_pending" as const;
export const ECO_DA_INCASSARE_SOURCE_PENDING = "eco_da_incassare_source_pending" as const;
