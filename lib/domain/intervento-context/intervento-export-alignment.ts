import { resolveInterventoCanonical } from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import type { PreventivoAnagraficaPatch } from "@/lib/preventivi/preventivo-anagrafica-map";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

const ALIGNMENT_KEYS = ["cliente", "targa", "matricola", "marcaAttrezzatura", "modelloAttrezzatura"] as const;

function norm(v: string | undefined | null): string {
  return String(v ?? "").trim().toLowerCase();
}

function uiFieldFromCanonical(
  ui: ReturnType<typeof resolveInterventoCanonical>,
  key: (typeof ALIGNMENT_KEYS)[number],
): string {
  const d = ui.display;
  switch (key) {
    case "cliente":
      return norm(d.cliente.value);
    case "targa":
      return norm(d.targa.value);
    case "matricola":
      return norm(d.matricola.value);
    case "marcaAttrezzatura":
      return norm(d.marcaAttrezzatura.value);
    case "modelloAttrezzatura":
      return norm(d.modelloAttrezzatura.value);
    default:
      return "";
  }
}

function exportFieldValue(
  pdfFields: SchedaIngressoFields | undefined,
  preventivoPatch: PreventivoAnagraficaPatch | undefined,
  key: (typeof ALIGNMENT_KEYS)[number],
): string {
  if (pdfFields) {
    return norm(pdfFields[key]);
  }
  if (preventivoPatch) {
    return norm(preventivoPatch[key]);
  }
  return "";
}

function exportAlignmentGuardEnabled(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return true;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return false;
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage?.getItem("INTERVENTO_EXPORT_ALIGNMENT") === "1") return true;
    } catch {
      /* ignore */
    }
  }
  return typeof process === "undefined" || process.env?.NODE_ENV === "development";
}

/** Runtime guard: UI canonical vs export snapshot — dev/test only, warning no throw. */
export function assertInterventoExportAlignment(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore | undefined,
  exportSnapshot: {
    pdfFields?: SchedaIngressoFields;
    preventivoPatch?: PreventivoAnagraficaPatch;
  },
): void {
  if (!exportAlignmentGuardEnabled()) return;
  const ui = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore });
  const exp = resolveInterventoCanonical("export", {
    lavorazioneRow: row,
    schedeStore,
    ingressoCampi: schedeStore?.[row.id]?.ingresso?.campi ?? null,
  });

  for (const key of ALIGNMENT_KEYS) {
    const uiVal = uiFieldFromCanonical(ui, key);
    const expVal = exportFieldValue(exportSnapshot.pdfFields, exportSnapshot.preventivoPatch, key);
    const canonicalExpVal = norm(exp.exportFields[key]);
    const compareVal = exportSnapshot.pdfFields || exportSnapshot.preventivoPatch ? expVal : canonicalExpVal;
    if (uiVal && compareVal && uiVal !== compareVal) {
      logInterventoTelemetry("intervento_export_alignment_mismatch", {
        lavorazioneId: row.id,
        mismatch: true,
        field: key,
        extra: { ui: uiVal, export: compareVal },
      });
    }
  }
}
