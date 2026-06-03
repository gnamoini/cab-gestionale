import { TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";

export const LAVORAZIONE_WRITABLE_KEYS = [
  "mezzo_id",
  "stato",
  "priorita",
  "data_ingresso",
  "data_uscita",
  "note",
] as const;

export type LavorazioneWritableKey = (typeof LAVORAZIONE_WRITABLE_KEYS)[number];

export type LavorazioneWritePayload = {
  mezzo_id?: string;
  stato?: StatoLavorazione;
  priorita?: PrioritaLavorazione;
  data_ingresso?: string | null;
  data_uscita?: string | null;
  note?: string | null;
};

export function normalizeLavorazioneNote(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length <= TEXT_LONG ? t : t.slice(0, TEXT_LONG);
}

export function pickLavorazioneWritePayload(data: Record<string, unknown>): LavorazioneWritePayload {
  const out: LavorazioneWritePayload = {};
  for (const key of LAVORAZIONE_WRITABLE_KEYS) {
    if (!(key in data) || data[key] === undefined) continue;
    if (key === "mezzo_id" && typeof data.mezzo_id === "string") {
      out.mezzo_id = data.mezzo_id.trim();
    } else if (key === "stato" && typeof data.stato === "string") {
      out.stato = data.stato as StatoLavorazione;
    } else if (key === "priorita" && typeof data.priorita === "string") {
      out.priorita = data.priorita as PrioritaLavorazione;
    } else if (key === "data_ingresso") {
      out.data_ingresso =
        data.data_ingresso === null || data.data_ingresso === undefined
          ? null
          : String(data.data_ingresso).trim() || null;
    } else if (key === "data_uscita") {
      out.data_uscita =
        data.data_uscita === null || data.data_uscita === undefined
          ? null
          : String(data.data_uscita).trim() || null;
    } else if (key === "note") {
      out.note = normalizeLavorazioneNote(
        data.note === null || data.note === undefined ? null : String(data.note),
      );
    }
  }
  return out;
}
