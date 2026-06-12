import { createClient } from "@supabase/supabase-js";
import { mergedEnv } from "./loadEnv.mjs";

const SUBSET_QUERIES = [
  {
    id: "rest-lav-light-attive",
    area: "Lavorazioni",
    table: "lavorazioni",
    select:
      "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, codice, mezzi(cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia)",
    filters: (q) => q.is("deleted_at", null).eq("archived", false).order("created_at", { ascending: false }),
  },
  {
    id: "rest-lav-report",
    area: "Report",
    table: "lavorazioni",
    select:
      "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice",
    filters: (q) => q.is("deleted_at", null).order("created_at", { ascending: false }),
  },
  {
    id: "rest-movimenti",
    area: "Report",
    table: "movimenti_ricambi",
    select: "id, ricambio_id, lavorazione_id, tipo, quantita, created_at",
    filters: (q) => q.order("created_at", { ascending: false }),
  },
  {
    id: "rest-preventivi",
    area: "Preventivi",
    table: "preventivi",
    select:
      "id, mezzo_id, lavorazione_id, cliente, totale, dettagli, created_at, updated_at, mezzi(id, cliente, marca, modello, targa, matricola, numero_scuderia)",
    filters: (q) => q.order("created_at", { ascending: false }),
  },
  {
    id: "rest-documenti",
    area: "Documenti",
    table: "documenti",
    select: "id, marca, modello, categoria, titolo, descrizione, file_path, created_at, updated_at, mezzo_id",
    filters: (q) => q.order("created_at", { ascending: false }),
  },
  {
    id: "rest-mezzi-list",
    area: "Mezzi",
    table: "mezzi",
    select:
      "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, entity_key, created_at, updated_at",
    filters: (q) => q.order("created_at", { ascending: false }),
  },
  {
    id: "rest-magazzino-list",
    area: "Magazzino",
    table: "magazzino_ricambi",
    select:
      "id, codice, nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at",
    filters: (q) => q.order("codice", { ascending: true }),
  },
];

async function measure(client, entry) {
  const t0 = performance.now();
  let q = client.from(entry.table).select(entry.select);
  if (entry.filters) q = entry.filters(q);
  const { data, error } = await q;
  const wallMs = Math.round((performance.now() - t0) * 100) / 100;
  const json = JSON.stringify(data ?? []);
  return {
    ...entry,
    wallMs,
    bytesRaw: Buffer.byteLength(json, "utf8"),
    bytesKb: Math.round((Buffer.byteLength(json, "utf8") / 1024) * 100) / 100,
    rowCount: Array.isArray(data) ? data.length : 0,
    error: error?.message ?? null,
  };
}

/**
 * Lightweight REST payload/latency subset for slow-query audit.
 */
export async function runRestBenchmarkSubset() {
  const env = mergedEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceKey) {
    return { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", results: [] };
  }
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const results = [];
  for (const entry of SUBSET_QUERIES) {
    results.push(await measure(client, entry));
  }
  return { ok: true, results };
}
