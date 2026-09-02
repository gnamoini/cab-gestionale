import { isPreventivoUuid } from "@/lib/preventivi/preventivi-db-mapper";
import { TEXT_SHORT } from "@/lib/validation/text-field-limits";

export const PREVENTIVO_WRITABLE_KEYS = [
  "id",
  "mezzo_id",
  "lavorazione_id",
  "cliente",
  "totale",
  "stato_workflow",
  "dettagli",
] as const;

export type PreventivoWritableKey = (typeof PREVENTIVO_WRITABLE_KEYS)[number];

export type PreventivoWritePayload = {
  id?: string;
  mezzo_id?: string | null;
  lavorazione_id?: string | null;
  cliente?: string;
  totale?: number;
  stato_workflow?: "bozza" | "inviato" | "annullato";
  dettagli?: Record<string, unknown>;
};

export function normalizePreventivoCliente(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.length <= TEXT_SHORT ? t : t.slice(0, TEXT_SHORT);
}

export function pickPreventivoWritePayload(data: Record<string, unknown>): PreventivoWritePayload {
  const out: PreventivoWritePayload = {};
  for (const key of PREVENTIVO_WRITABLE_KEYS) {
    if (!(key in data) || data[key] === undefined) continue;
    if (key === "id" && typeof data.id === "string" && isPreventivoUuid(data.id)) {
      out.id = data.id.trim();
    } else if (key === "cliente" && typeof data.cliente === "string") {
      out.cliente = normalizePreventivoCliente(data.cliente);
    } else if (key === "mezzo_id") {
      if (data.mezzo_id === null) {
        out.mezzo_id = null;
      } else if (typeof data.mezzo_id === "string") {
        out.mezzo_id = data.mezzo_id.trim();
      }
    } else if (key === "lavorazione_id") {
      out.lavorazione_id =
        data.lavorazione_id === null || data.lavorazione_id === undefined
          ? null
          : String(data.lavorazione_id).trim() || null;
    } else if (key === "totale") {
      const n = Number(data.totale);
      if (Number.isFinite(n)) out.totale = n;
    } else if (key === "stato_workflow" && typeof data.stato_workflow === "string") {
      const wf = data.stato_workflow.trim();
      if (wf === "bozza" || wf === "inviato" || wf === "annullato") {
        out.stato_workflow = wf;
      }
    } else if (key === "dettagli" && data.dettagli != null && typeof data.dettagli === "object") {
      out.dettagli = data.dettagli as Record<string, unknown>;
    }
  }
  return out;
}
