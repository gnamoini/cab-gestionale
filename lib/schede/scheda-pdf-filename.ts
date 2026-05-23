import { formatPdfFileNameDateYmd, sanitizePdfFileNamePart } from "@/lib/pdf/pdf-filename-utils";
import { isoToDateInputValue, parseItalianDayToIso } from "@/lib/lavorazioni/date-day-only";
import type { SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc, SchedaTipo } from "@/types/schede";

export type SchedaPdfTipoSlug = "scheda-ingresso" | "scheda-lavorazione" | "scheda-ricambi";

const TIPO_SLUG: Record<SchedaTipo, SchedaPdfTipoSlug> = {
  ingresso: "scheda-ingresso",
  lavorazioni: "scheda-lavorazione",
  ricambi: "scheda-ricambi",
};

export function schedaTipoToPdfSlug(tipo: SchedaTipo): SchedaPdfTipoSlug {
  return TIPO_SLUG[tipo];
}

function dateYmdFromIso(iso: string | undefined | null): string | null {
  const t = iso?.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return formatPdfFileNameDateYmd(d);
}

/** Data emissione/creazione per nome file (yyyy-mm-dd). */
export function formatSchedaPdfDateYmd(doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc): string {
  const fromCreated = dateYmdFromIso(doc.createdAt);
  if (fromCreated) return fromCreated;

  if (doc.tipo === "ingresso") {
    const parsed = parseItalianDayToIso(doc.campi.dataIngresso);
    if (parsed.ok) return isoToDateInputValue(parsed.iso);
    const raw = doc.campi.dataIngresso.trim();
    if (raw) return sanitizePdfFileNamePart(raw.replace(/\//g, "-"), "data");
  }

  const fromUpdated = dateYmdFromIso(doc.updatedAt);
  if (fromUpdated) return fromUpdated;

  return formatPdfFileNameDateYmd(new Date());
}

/**
 * Nome file export PDF schede:
 * scheda-ingresso_LV-1024_2026-01-23.pdf
 */
export function buildSchedaPdfDownloadFileName(opts: {
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  lavorazioneId: string;
  /** Fallback legacy (pre-unificazione: titolo scheda senza id/data strutturati). */
  titoloScheda?: string;
}): string {
  const slug = schedaTipoToPdfSlug(opts.doc.tipo);
  const lavRaw = opts.lavorazioneId.trim();
  const lavId = sanitizePdfFileNamePart(lavRaw, "");
  const datePart = formatSchedaPdfDateYmd(opts.doc);

  if (lavId) {
    return `${slug}_${lavId}_${datePart}.pdf`;
  }

  const legacyTitle = sanitizePdfFileNamePart(opts.titoloScheda ?? slug, slug)
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `${legacyTitle}_${datePart}.pdf`;
}
