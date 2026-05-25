import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";
import type { SchedaLavorazioneRow, TipoSchedaLavorazione } from "@/src/types/supabase-tables";
import type { SchedaInsert, SchedaUpdate } from "@/src/services/schede.service";
import {
  bundleKeyToDbTipo,
  dbTipoToBundleKey,
  normalizeSchedaTipoDb,
  type SchedaBundleKey,
} from "@/lib/schede/scheda-tipo-db-mapper";

function rowToDoc(row: SchedaLavorazioneRow): unknown {
  const c = row.contenuto ?? {};
  if (c && typeof c === "object" && "doc" in (c as object)) {
    return (c as { doc: unknown }).doc;
  }
  return c;
}

export function schedaRowsToBundle(
  lavorazioneId: string,
  rows: readonly SchedaLavorazioneRow[],
  codice?: string | null,
): LavorazioneSchedeBundle {
  const bundle: LavorazioneSchedeBundle = {
    lavorazioneId,
    codice: codice?.trim() || null,
    ingresso: null,
    lavorazioni: null,
    ricambi: null,
  };
  for (const row of rows) {
    const bundleKey = dbTipoToBundleKey(row.tipo);
    if (!bundleKey) continue;
    const doc = rowToDoc(row);
    if (bundleKey === "ingresso") bundle.ingresso = doc as LavorazioneSchedeBundle["ingresso"];
    if (bundleKey === "lavorazioni") bundle.lavorazioni = doc as LavorazioneSchedeBundle["lavorazioni"];
    if (bundleKey === "ricambi") bundle.ricambi = doc as LavorazioneSchedeBundle["ricambi"];
  }
  return bundle;
}

export function schedaRowsToStore(rows: readonly SchedaLavorazioneRow[]): LavorazioneSchedeStore {
  const byLav = new Map<string, SchedaLavorazioneRow[]>();
  for (const row of rows) {
    const list = byLav.get(row.lavorazione_id) ?? [];
    list.push(row);
    byLav.set(row.lavorazione_id, list);
  }
  const store: LavorazioneSchedeStore = {};
  for (const [lavId, list] of byLav) {
    store[lavId] = schedaRowsToBundle(lavId, list);
  }
  return store;
}

export function bundleToSchedaPayloads(bundle: LavorazioneSchedeBundle): {
  tipo: TipoSchedaLavorazione;
  contenuto: Record<string, unknown>;
  rowId?: string;
}[] {
  const out: { tipo: TipoSchedaLavorazione; contenuto: Record<string, unknown>; rowId?: string }[] = [];
  const pairs: [SchedaBundleKey, unknown][] = [
    ["ingresso", bundle.ingresso],
    ["lavorazioni", bundle.lavorazioni],
    ["ricambi", bundle.ricambi],
  ];
  for (const [key, doc] of pairs) {
    if (!doc) continue;
    const meta = doc as { id?: string };
    out.push({
      tipo: bundleKeyToDbTipo(key),
      contenuto: { doc, bundleKey: key },
      rowId: typeof meta.id === "string" && meta.id.length > 10 ? meta.id : undefined,
    });
  }
  return out;
}

export function schedaInsertFromBundlePart(
  lavorazioneId: string,
  tipo: TipoSchedaLavorazione,
  contenuto: Record<string, unknown>,
): SchedaInsert {
  return { lavorazione_id: lavorazioneId, tipo, contenuto };
}

export function schedaUpdateFromContenuto(contenuto: Record<string, unknown>): SchedaUpdate {
  return { contenuto };
}

export function mergeSchedeStores(
  local: LavorazioneSchedeStore,
  remote: LavorazioneSchedeStore,
  dbPrimary: boolean,
): LavorazioneSchedeStore {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: LavorazioneSchedeStore = {};
  for (const id of keys) {
    const l = local[id];
    const r = remote[id];
    if (!l && r) out[id] = r;
    else if (l && !r) out[id] = l;
    else if (l && r) out[id] = dbPrimary ? r : l;
  }
  return out;
}
