import { parseItalianDayToIso } from "@/lib/lavorazioni/date-day-only";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";

function ymdFromLavorazioneDate(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const it = parseItalianDayToIso(t);
  if (it.ok) return ymdFromIso(it.iso);
  if (!Number.isNaN(Date.parse(t))) return ymdFromIso(t);
  return null;
}

function ymdToUtcDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map((part) => parseInt(part, 10));
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Giorni di calendario inclusivi (Europe/Rome): stesso giorno ingresso/uscita = 1. */
export function permanenzaGiorniInteri(
  dataIngresso: string | null | undefined,
  dataCompletamento: string | null | undefined,
): number {
  if (!dataIngresso?.trim() || !dataCompletamento?.trim()) return 0;
  const startYmd = ymdFromLavorazioneDate(dataIngresso);
  const endYmd = ymdFromLavorazioneDate(dataCompletamento);
  if (!startYmd || !endYmd) return 0;
  const diff = ymdToUtcDay(endYmd) - ymdToUtcDay(startYmd);
  return diff >= 0 ? diff + 1 : 0;
}

export function formatPermanenzaGiorniInteriLabel(giorni: number): string {
  if (giorni <= 0) return "—";
  if (giorni === 1) return "1 giorno";
  return `${giorni} giorni`;
}

export function permanenzaGiorniTra(
  isoIn: string,
  isoOut: string | null | undefined,
): { label: string; num: number } {
  if (!isoOut?.trim()) return { label: "—", num: 0 };
  const num = permanenzaGiorniInteri(isoIn, isoOut);
  return { label: formatPermanenzaGiorniInteriLabel(num), num };
}

export function formatDurataMs(ms: number): string {
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function computeDurataAttiva(lav: LavorazioneAttiva): string {
  if (!lav.dataCompletamento) return "—";
  const start = new Date(lav.dataIngresso).getTime();
  const end = new Date(lav.dataCompletamento).getTime();
  return formatDurataMs(end - start);
}

export function meseCompletamentoFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Durata tra ingresso e completamento: priorità ai giorni; opzionale ore residue (es. 3g 4h). */
export function formatDurataGiorni(
  dataIngresso: string | null | undefined,
  dataCompletamento: string | null | undefined,
): string {
  if (!dataIngresso?.trim() || !dataCompletamento?.trim()) return "—";
  const start = new Date(dataIngresso).getTime();
  const end = new Date(dataCompletamento).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const ms = end - start;
  const giorni = Math.floor(ms / 86400000);
  const rest = ms % 86400000;
  const ore = Math.floor(rest / 3600000);
  if (ore > 0) return `${giorni}g ${ore}h`;
  if (giorni === 0) return "0 giorni";
  if (giorni === 1) return "1 giorno";
  return `${giorni} giorni`;
}

/** Millisecondi tra ingresso e completamento (per ordinamento storico). */
export function durataMsStorico(dataIngresso: string, dataCompletamento: string): number {
  const a = new Date(dataIngresso).getTime();
  const b = new Date(dataCompletamento).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, b - a);
}
