import type { QueryClient } from "@tanstack/react-query";
import { magazzinoRowToRicambioUI, ricambioUiToMagazzinoInsert } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { sanitizeCompatRicambioUiBatch } from "@/lib/magazzino/compat/compat-runtime-sanitize";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { magazzinoListQueryKey as magazzinoListQueryKeyFactory } from "@/lib/render/query-key-factory";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

/** @deprecated Use `magazzinoListQueryKey("list", null)` from query-key-factory. */
export function magazzinoListQueryKey() {
  return magazzinoListQueryKeyFactory("list", null);
}

export function mapMagazzinoRowsToUI(
  rows: readonly MagazzinoRicambioRow[],
  autore = "Sistema",
  mezziListe?: MezziListePrefs,
): RicambioMagazzino[] {
  const ui = rows.map((row) => magazzinoRowToRicambioUI(row, autore, mezziListe));
  return sanitizeCompatRicambioUiBatch(ui, mezziListe, "magazzino-list-cache.mapMagazzinoRowsToUI");
}

/** Singola riga DB → UI con sanitize compat SSOT (post-save / patch puntuali). */
export function ricambioUiFromMagazzinoRow(
  row: MagazzinoRicambioRow,
  autore = "Sistema",
  mezziListe?: MezziListePrefs,
): RicambioMagazzino {
  return mapMagazzinoRowsToUI([row], autore, mezziListe)[0]!;
}

export type PatchMagazzinoListCacheOptions = {
  /** ponytail: solo quantita/updated_at (+ autore in meta) — es. +/- scorta, senza riserializzare compat. */
  quantitaOnly?: boolean;
};

function patchRowMetaAutore(
  meta: MagazzinoRicambioRow["meta"],
  autore?: string,
): MagazzinoRicambioRow["meta"] {
  const trimmed = autore?.trim();
  if (!trimmed) return meta;
  const base =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};
  return { ...base, autoreUltimaModifica: trimmed } as MagazzinoRicambioRow["meta"];
}

function uiItemToRow(
  ui: RicambioMagazzino,
  existing?: MagazzinoRicambioRow,
  mezziListe?: MezziListePrefs,
  options?: PatchMagazzinoListCacheOptions,
): MagazzinoRicambioRow {
  if (options?.quantitaOnly && existing) {
    return {
      ...existing,
      quantita: Math.max(0, Math.round(ui.scorta)),
      meta: patchRowMetaAutore(existing.meta, ui.autoreUltimaModifica),
      updated_at: ui.dataUltimaModifica,
    };
  }

  const patch = ricambioUiToMagazzinoInsert(ui, mezziListe);
  if (existing) {
    return {
      ...existing,
      codice: patch.codice,
      nome: patch.nome,
      marca: patch.marca ?? null,
      quantita: patch.quantita ?? existing.quantita,
      costo: patch.costo ?? null,
      prezzo_vendita: patch.prezzo_vendita ?? null,
      meta: (patch.meta ?? existing.meta) as MagazzinoRicambioRow["meta"],
      updated_at: ui.dataUltimaModifica,
    };
  }
  const now = ui.dataUltimaModifica || new Date().toISOString();
  return {
    id: ui.id,
    codice: patch.codice,
    nome: patch.nome,
    marca: patch.marca ?? null,
    quantita: patch.quantita ?? 0,
    costo: patch.costo ?? null,
    prezzo_vendita: patch.prezzo_vendita ?? null,
    consumo_medio_mensile: null,
    meta: (patch.meta ?? {}) as MagazzinoRicambioRow["meta"],
    created_at: now,
    updated_at: now,
  };
}

/** Patch ottimistico cache lista magazzino (unica source UI). */
export function patchMagazzinoListCache(
  qc: QueryClient,
  updater: (prev: RicambioMagazzino[]) => RicambioMagazzino[],
  autore = "Sistema",
  mezziListe?: MezziListePrefs,
  options?: PatchMagazzinoListCacheOptions,
): void {
  qc.setQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey(), (old) => {
    const rows = old ?? [];
    if (options?.quantitaOnly) {
      const ui = rows.map((row) => magazzinoRowToRicambioUI(row, autore, mezziListe));
      const next = updater(ui);
      const rowById = new Map(rows.map((row) => [row.id, row]));
      return next.map((item) => uiItemToRow(item, rowById.get(item.id), mezziListe, options));
    }
    const ui = mapMagazzinoRowsToUI(rows, autore, mezziListe);
    const next = updater(ui);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    return next.map((item) => uiItemToRow(item, rowById.get(item.id), mezziListe, options));
  });
}

export function setMagazzinoListCacheRows(qc: QueryClient, rows: MagazzinoRicambioRow[]): void {
  qc.setQueryData(magazzinoListQueryKey(), rows);
}
