import type { LogModificaRow } from "@/src/types/supabase-tables";

const MS_PER_DAY = 86_400_000;

/** Decay: 1.0 oggi → 0.5 a 30gg → 0.1 a 90gg+ */
export function freshnessFactor(createdAt: string | Date, now = Date.now()): number {
  const ts = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  if (!Number.isFinite(ts)) return 0.5;
  const ageDays = Math.max(0, (now - ts) / MS_PER_DAY);
  if (ageDays <= 1) return 1;
  if (ageDays <= 30) return 1 - (ageDays / 30) * 0.5;
  if (ageDays <= 90) return 0.5 - ((ageDays - 30) / 60) * 0.4;
  return 0.1;
}

export function baseActivityScore(row: LogModificaRow): number {
  const eventType = (row as LogModificaRow & { event_type?: string }).event_type;
  const entita = row.entita;
  const azione = row.azione;
  const payload = row.payload;
  const summaryModifiche =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as { summary?: { modifiche?: string[] } }).summary?.modifiche
      : undefined;

  if (eventType === "IMPORT_EVENT") return 60;
  if (eventType === "WORKFLOW_ACTION") {
    if (/chius|complet|conclus/i.test(row.title ?? row.azione)) return 80;
    if (/approv/i.test(row.title ?? row.azione)) return 70;
    return 50;
  }
  if (eventType === "SECURITY_ACTION") return 90;

  if (entita === "mezzi" && summaryModifiche?.some((l) => /fermo|non operativ/i.test(l))) return 100;
  if (entita === "lavorazioni" && (azione === "CLOSE" || /conclus|chius/i.test(azione))) return 80;
  if (entita === "magazzino_ricambi" && summaryModifiche?.some((l) => /sotto scorta|scorta minima/i.test(l))) {
    return 80;
  }
  if (entita === "preventivi" && /approv/i.test(azione)) return 70;

  if (summaryModifiche?.length === 1 && /descrizion|nota/i.test(summaryModifiche[0] ?? "")) return 10;
  if (
    summaryModifiche?.every((l) =>
      /updated.?by|created.?by|entity.?key|autore|data ultima/i.test(l),
    )
  ) {
    return 1;
  }

  if (azione === "CREATE") return 40;
  if (azione === "DELETE") return 60;
  return 20;
}

export function scoreActivity(row: LogModificaRow, now = Date.now()): number {
  return baseActivityScore(row) * freshnessFactor(row.created_at, now);
}
