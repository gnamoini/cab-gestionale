import { isoToItDisplay } from "@/lib/lavorazioni/date-day-only";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";

export type DataIngressoWriteResolution = {
  changed: boolean;
  /** yyyy-mm-dd per colonna `date` Postgres. */
  value: string | null;
  displayCanonical: string | null;
};

/** Normalizza `data_ingresso` DB (date o timestamp) in yyyy-mm-dd locale. */
export function ymdFromLavorazioneDataIngresso(value: string | null | undefined): string | null {
  const s = value?.trim();
  if (!s) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveDataIngressoWriteValue(
  rowDataIngresso: string | null | undefined,
  displayDataIngresso: string,
): DataIngressoWriteResolution {
  const trimmed = displayDataIngresso.trim();
  if (!trimmed) {
    return { changed: false, value: null, displayCanonical: null };
  }

  const parsed = parseItalianDayDisplayToIso(trimmed);
  if (!parsed.ok) {
    return { changed: false, value: null, displayCanonical: null };
  }

  const newYmd = parsed.iso.slice(0, 10);
  const displayCanonical = isoToItDisplay(parsed.iso) || trimmed;
  const currentYmd = ymdFromLavorazioneDataIngresso(rowDataIngresso);

  if (currentYmd === newYmd) {
    return { changed: false, value: newYmd, displayCanonical };
  }

  return { changed: true, value: newYmd, displayCanonical };
}
