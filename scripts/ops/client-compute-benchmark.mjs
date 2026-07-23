/**
 * Proxy benchmark for client-side filter/sort/report derive (Node, sample data).
 * Usage: node scripts/ops/client-compute-benchmark.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function bench(label, fn, iterations = 200) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const totalMs = performance.now() - t0;
  return { label, iterations, totalMs: Math.round(totalMs * 100) / 100, perRunUs: Math.round((totalMs / iterations) * 1000) };
}

function lavHaystack(row) {
  return [row.codice, row.note, row.stato, row.mezzi?.cliente, row.mezzi?.targa].filter(Boolean).join(" ").toLowerCase();
}

function lavFilter(rows, term) {
  const t = term.toLowerCase();
  return rows.filter((r) => lavHaystack(r).includes(t));
}

function lavSort(rows, key) {
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = key === "cliente" ? a.mezzi?.cliente ?? "" : a[key] ?? "";
    const bv = key === "cliente" ? b.mezzi?.cliente ?? "" : b[key] ?? "";
    return String(av).localeCompare(String(bv), "it");
  });
  return copy;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let rows = [];
if (url && serviceKey) {
  const client = createClient(url, serviceKey);
  const select =
    `id, mezzo_id, stato, priorita, data_ingresso, note, codice, archived, created_at, mezzi!lavorazioni_mezzo_id_fkey(id, cliente, utilizzatore, marca, modello, targa)`;
  const { data } = await client
    .from("lavorazioni")
    .select(select)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  rows = data ?? [];
}

const n = rows.length || 37;
const synthetic = rows.length
  ? rows
  : Array.from({ length: n }, (_, i) => ({
      id: `id-${i}`,
      codice: `26-${String(i).padStart(2, "0")}`,
      note: `note ${i}`,
      stato: "accettazione",
      priorita: "media",
      created_at: new Date().toISOString(),
      mezzi: { cliente: `Cliente ${i % 5}`, targa: `AA${i}` },
    }));

const results = {
  generatedAt: new Date().toISOString(),
  rowCount: synthetic.length,
  benchmarks: [
    bench("lav_filter_search", () => lavFilter(synthetic, "26")),
    bench("lav_sort_cliente", () => lavSort(synthetic, "cliente")),
    bench("lav_filter_plus_sort", () => lavSort(lavFilter(synthetic, "a"), "cliente")),
    bench("report_fingerprint_hash", () => {
      const s = JSON.stringify(synthetic);
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    }),
    bench("json_parse_payload", () => JSON.parse(JSON.stringify(synthetic))),
  ],
  scaleProjection: {
    at37rows_us: null,
    at500rows_estimated_ms: null,
  },
};

const filterUs = results.benchmarks.find((b) => b.label === "lav_filter_plus_sort")?.perRunUs ?? 0;
results.scaleProjection.at37rows_us = filterUs;
results.scaleProjection.at500rows_estimated_ms = Math.round(((filterUs * 500) / 37 / 1000) * 10) / 10;

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
const outPath = join(process.cwd(), "test-results", "client-compute-benchmark.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
process.stdout.write(JSON.stringify(results, null, 2));
