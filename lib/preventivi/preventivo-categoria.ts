import type { PreventivoCategoria, PreventivoRecord } from "@/lib/preventivi/types";
import { isPreventivoUuid } from "@/lib/preventivi/preventivi-db-mapper";

export type { PreventivoCategoria };

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

export type PreventivoCategoriaBadgeVariant = "table" | "inline";

export type PreventivoCategoriaOptionMeta = {
  id: PreventivoCategoria;
  title: string;
  subtitle: string;
  description: string;
  highlights: readonly string[];
};

/** SSOT scelta contesto preventivo (dialog nuovo + badge UI). */
export const PREVENTIVO_CATEGORIA_OPTIONS: readonly PreventivoCategoriaOptionMeta[] = [
  {
    id: "lavorazione",
    title: "Lavorazione",
    subtitle: "Intervento su mezzo",
    description: "Per riparazioni e interventi con scheda ingresso, attrezzatura e telaio.",
    highlights: ["Scheda ingresso completa", "Collegamento a lavorazione", "Manodopera da listino"],
  },
  {
    id: "vendita",
    title: "Vendita",
    subtitle: "Ricambi e servizi",
    description: "Per preventivi standalone senza mezzo né lavorazione collegata.",
    highlights: ["Solo dati cliente", "Righe ricambi e manodopera", "PDF interno, senza portale"],
  },
] as const;

export function preventivoCategoriaOptionMeta(categoria: PreventivoCategoria): PreventivoCategoriaOptionMeta {
  return PREVENTIVO_CATEGORIA_OPTIONS.find((o) => o.id === categoria) ?? PREVENTIVO_CATEGORIA_OPTIONS[0]!;
}

export function preventivoCategoriaBadgeLabel(
  categoria: PreventivoCategoria,
  style: "title" | "chip" | "short" = "title",
): string {
  if (style === "chip") return categoria === "vendita" ? "Vend" : "Lav";
  if (style === "short") return categoria === "vendita" ? "Vend." : "Lav.";
  return preventivoCategoriaLabel(categoria);
}

export function preventivoCategoriaBadgeClass(
  categoria: PreventivoCategoria,
  variant: PreventivoCategoriaBadgeVariant = "inline",
): string {
  const table = variant === "table";
  const base = table
    ? "inline-flex h-[1.125rem] min-w-[2.35rem] shrink-0 items-center justify-center rounded px-1.5 text-[9px] font-bold uppercase leading-none tracking-[0.06em]"
    : "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide";
  if (categoria === "vendita") {
    return `${base} bg-violet-600 text-white ring-1 ring-violet-700/40 dark:bg-violet-500 dark:text-white dark:ring-violet-400/50`;
  }
  return `${base} bg-teal-700 text-white ring-1 ring-teal-800/40 dark:bg-teal-600 dark:text-white dark:ring-teal-500/50`;
}
