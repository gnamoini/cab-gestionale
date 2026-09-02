import type { PreventivoCategoria, PreventivoRecord } from "@/lib/preventivi/types";
import { isPreventivoUuid } from "@/lib/preventivi/preventivi-db-mapper";

export const PREVENTIVO_CATEGORIE = ["lavorazione", "vendita"] as const satisfies readonly PreventivoCategoria[];

export function normalizePreventivoCategoria(value: unknown): PreventivoCategoria | undefined {
  if (value === "lavorazione" || value === "vendita") return value;
  return undefined;
}

export type ResolvePreventivoCategoriaInput = {
  categoriaPreventivo?: unknown;
  lavorazioneId?: string | null;
  mezzoId?: string | null;
};

/** Categoria esplicita in dettagli vince; inferenza solo per legacy. */
export function resolvePreventivoCategoria(input: ResolvePreventivoCategoriaInput): PreventivoCategoria {
  const explicit = normalizePreventivoCategoria(input.categoriaPreventivo);
  if (explicit === "vendita") return "vendita";
  if (explicit === "lavorazione") return "lavorazione";
  const lavId = input.lavorazioneId?.trim() ?? "";
  if (lavId && isPreventivoUuid(lavId)) return "lavorazione";
  const mezzoId = input.mezzoId?.trim() ?? "";
  if (mezzoId && isPreventivoUuid(mezzoId)) return "lavorazione";
  return "vendita";
}

export function resolvePreventivoCategoriaFromRecord(record: PreventivoRecord): PreventivoCategoria {
  return resolvePreventivoCategoria({
    categoriaPreventivo: record.categoriaPreventivo,
    lavorazioneId: record.lavorazioneId,
    mezzoId: record.mezzoId,
  });
}

export function isPreventivoVendita(record: PreventivoRecord): boolean {
  return resolvePreventivoCategoriaFromRecord(record) === "vendita";
}

export function preventivoCategoriaLabel(categoria: PreventivoCategoria): string {
  return categoria === "vendita" ? "Vendita" : "Lavorazione";
}

export function preventivoCategoriaNuovoLabel(categoria: PreventivoCategoria): string {
  return categoria === "vendita" ? "Preventivo per vendita" : "Preventivo per lavorazione";
}
