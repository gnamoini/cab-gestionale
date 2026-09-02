/** Payload immutabile scritto dal trigger DB su notification_outbox (magazzino.below_minimum). */

export type MagazzinoStockAlertOutboxPayload = {
  episode_id: string;
  ricambio_id: string;
  codice: string;
  nome: string;
  marca: string;
  quantita: number;
  scorta_minima: number;
  prev_quantita: number;
  prev_scorta_minima: number;
  curr_quantita: number;
  curr_scorta_minima: number;
};

function asNonNegativeInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function asUuidString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function parseMagazzinoStockAlertOutboxPayload(
  raw: Record<string, unknown> | null | undefined,
): MagazzinoStockAlertOutboxPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const episodeId = asUuidString(raw.episode_id);
  const ricambioId = asUuidString(raw.ricambio_id);
  const quantita = asNonNegativeInt(raw.quantita ?? raw.curr_quantita);
  const scortaMinima = asNonNegativeInt(raw.scorta_minima ?? raw.curr_scorta_minima);
  const prevQuantita = asNonNegativeInt(raw.prev_quantita);
  const prevScortaMinima = asNonNegativeInt(raw.prev_scorta_minima);
  const currQuantita = asNonNegativeInt(raw.curr_quantita ?? raw.quantita);
  const currScortaMinima = asNonNegativeInt(raw.curr_scorta_minima ?? raw.scorta_minima);

  if (!episodeId || !ricambioId || quantita == null || scortaMinima == null) return null;
  if (prevQuantita == null || prevScortaMinima == null || currQuantita == null || currScortaMinima == null) {
    return null;
  }

  return {
    episode_id: episodeId,
    ricambio_id: ricambioId,
    codice: typeof raw.codice === "string" ? raw.codice : "",
    nome: typeof raw.nome === "string" ? raw.nome : "",
    marca: typeof raw.marca === "string" ? raw.marca : "",
    quantita,
    scorta_minima: scortaMinima,
    prev_quantita: prevQuantita,
    prev_scorta_minima: prevScortaMinima,
    curr_quantita: currQuantita,
    curr_scorta_minima: currScortaMinima,
  };
}
