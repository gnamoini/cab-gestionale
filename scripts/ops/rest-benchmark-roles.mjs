/**
 * REST benchmark: service role vs admin vs operatore (RLS impact).
 * Usage: node scripts/ops/rest-benchmark-roles.mjs > test-results/rest-benchmark-roles.json
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, SMOKE_ADMIN_EMAIL/PASSWORD, SMOKE_OPERATOR_EMAIL/PASSWORD
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LAVORAZIONI_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice";
const LAVORAZIONI_LIST_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, codice";
const LAVORAZIONI_REPORT_LIGHT_COLUMNS =
  "id, mezzo_id, stato, priorita, data_ingresso, data_uscita, note, created_by, created_at, updated_at, updated_by, archived, archived_at, deleted_at, codice";
const MEZZI_LIST_EMBED_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, entity_key";
const MEZZI_EMBED_LIGHT_COLUMNS =
  "cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia";
const MEZZI_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, meta, entity_key, created_at, updated_at";
const MEZZI_LIST_LIGHT_COLUMNS =
  "id, cliente, utilizzatore, marca, modello, targa, matricola, numero_scuderia, tipo_attrezzatura, anno, entity_key, created_at, updated_at";
const MEZZI_REPORT_LIGHT_COLUMNS =
  "id, marca, modello, targa, matricola, numero_scuderia, cliente, tipo_attrezzatura";
const MAGAZZINO_RICAMBI_COLUMNS =
  "id, codice, nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at";
const MAGAZZINO_REPORT_LIGHT_COLUMNS =
  "id, codice, nome, marca, quantita, costo, prezzo_vendita, consumo_medio_mensile, meta, entity_key, created_at, updated_at";
const MOVIMENTI_RICAMBI_COLUMNS = "id, ricambio_id, lavorazione_id, tipo, quantita, created_at";
const DASHBOARD_PROMEMORIA_COLUMNS =
  "id, created_at, updated_at, created_by, event_date, event_time, title, description, deleted_at, notified_on, entity_type, entity_id, series_id, recurrence_frequency, recurrence_interval, recurrence_until";

const LAVORAZIONI_MEZZO_ID_FKEY = "lavorazioni_mezzo_id_fkey";
const lavorazioniMezziEmbed = (columns) => `mezzi!${LAVORAZIONI_MEZZO_ID_FKEY}(${columns})`;

const PROFILE_PART =
  "updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome), created_by_profile:profiles!lavorazioni_created_by_fkey(nome)";
const MEZZI_EMBED = lavorazioniMezziEmbed(MEZZI_LIST_EMBED_COLUMNS);

const MEZZI_EMBED_LIGHT = lavorazioniMezziEmbed(MEZZI_EMBED_LIGHT_COLUMNS);

const SELECT_VARIANTS = {
  lavorazioni_A_columns_only: LAVORAZIONI_COLUMNS,
  lavorazioni_B_mezzi_embed: `${LAVORAZIONI_COLUMNS}, ${MEZZI_EMBED}`,
  lavorazioni_C_profiles_only: `${LAVORAZIONI_COLUMNS}, ${PROFILE_PART}`,
  lavorazioni_D_full: `${LAVORAZIONI_COLUMNS}, ${PROFILE_PART}, ${MEZZI_EMBED}`,
  lavorazioni_E_light_attive: `${LAVORAZIONI_LIST_LIGHT_COLUMNS}, ${MEZZI_EMBED_LIGHT}`,
  lavorazioni_F_report_light: LAVORAZIONI_REPORT_LIGHT_COLUMNS,
};

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

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

async function signInClient(label, email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { client, userId: data.user?.id ?? null, email };
}

async function impersonateViaMagicLink(adminClient, email) {
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(`magiclink for ${email}: ${linkErr.message}`);
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error(`no hashed_token for ${email}`);
  const { data: verified, error: otpErr } = await anonClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (otpErr) throw new Error(`verifyOtp for ${email}: ${otpErr.message}`);
  return {
    client: anonClient,
    userId: verified.user?.id ?? null,
    email,
  };
}

async function resolveProfileUsers(adminClient) {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, ruolo")
    .in("ruolo", ["admin", "operatore"])
    .limit(10);
  if (error) throw new Error(`profiles lookup: ${error.message}`);
  const adminRow = data?.find((r) => r.ruolo === "admin");
  const opRow = data?.find((r) => r.ruolo === "operatore");
  const out = [];
  if (adminRow?.id) {
    const { data: u } = await adminClient.auth.admin.getUserById(adminRow.id);
    if (u?.user?.email) out.push({ role: "admin", email: u.user.email, id: adminRow.id });
  }
  if (opRow?.id) {
    const { data: u } = await adminClient.auth.admin.getUserById(opRow.id);
    if (u?.user?.email) out.push({ role: "operatore", email: u.user.email, id: opRow.id });
  }
  return out;
}

async function measureRest(client, name, run) {
  const t0 = performance.now();
  const result = await run();
  const wallMs = Math.round((performance.now() - t0) * 100) / 100;
  const bytesRaw = result.bytesRaw ?? 0;
  const rowCount = Array.isArray(result.data) ? result.data.length : (result.count ?? 0);
  return {
    name,
    wallMs,
    bytesRaw,
    bytesGzip: result.bytesGzip ?? null,
    rowCount,
    error: result.error ?? null,
    select: result.select ?? null,
  };
}

async function fetchWithSize(client, table, select, applyFilters) {
  let q = client.from(table).select(select);
  if (applyFilters) q = applyFilters(q);
  const { data, error } = await q;
  const json = JSON.stringify(data ?? []);
  return {
    data,
    error: error?.message ?? null,
    bytesRaw: Buffer.byteLength(json, "utf8"),
    select,
  };
}

async function fetchGzipSize(restPath) {
  try {
    const res = await fetch(restPath, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceKey || anonKey}`,
        Accept: "application/json",
        "Accept-Encoding": "gzip",
      },
    });
    const buf = await res.arrayBuffer();
    return { bytesGzip: buf.byteLength, contentEncoding: res.headers.get("content-encoding") };
  } catch {
    return { bytesGzip: null, contentEncoding: null };
  }
}

function lavorazioniFilters(archived) {
  return (q) =>
    q.is("deleted_at", null).eq("archived", archived).order("created_at", { ascending: false });
}

function buildQueries() {
  const queries = [];

  for (const [variantName, select] of Object.entries(SELECT_VARIANTS)) {
    queries.push({
      name: variantName,
      table: "lavorazioni",
      select,
      filters: lavorazioniFilters(false),
    });
  }

  queries.push(
    {
      name: "lavorazioni_list_full_attive",
      table: "lavorazioni",
      select: SELECT_VARIANTS.lavorazioni_D_full,
      filters: lavorazioniFilters(false),
    },
    {
      name: "lavorazioni_list_light_attive",
      table: "lavorazioni",
      select: SELECT_VARIANTS.lavorazioni_E_light_attive,
      filters: lavorazioniFilters(false),
    },
    {
      name: "lavorazioni_list_full_chiuse",
      table: "lavorazioni",
      select: SELECT_VARIANTS.lavorazioni_D_full,
      filters: lavorazioniFilters(true),
    },
    {
      name: "lavorazioni_archived_false_no_embed",
      table: "lavorazioni",
      select: LAVORAZIONI_COLUMNS,
      filters: lavorazioniFilters(false),
    },
    {
      name: "lavorazioni_search",
      table: "lavorazioni",
      select: LAVORAZIONI_COLUMNS,
      filters: (q) =>
        q
          .is("deleted_at", null)
          .or("note.ilike.%test%,codice.ilike.%26%")
          .order("created_at", { ascending: false }),
    },
    {
      name: "mezzi_list",
      table: "mezzi",
      select: MEZZI_COLUMNS,
      filters: (q) => q.order("created_at", { ascending: false }),
    },
    {
      name: "mezzi_list_light",
      table: "mezzi",
      select: MEZZI_LIST_LIGHT_COLUMNS,
      filters: (q) => q.order("created_at", { ascending: false }),
    },
    {
      name: "magazzino_list",
      table: "magazzino_ricambi",
      select: MAGAZZINO_RICAMBI_COLUMNS,
      filters: (q) => q.order("codice", { ascending: true }),
    },
    {
      name: "movimenti_list",
      table: "movimenti_ricambi",
      select: MOVIMENTI_RICAMBI_COLUMNS,
      filters: (q) => q.order("created_at", { ascending: false }),
    },
    {
      name: "dashboard_promemoria",
      table: "dashboard_promemoria",
      select: DASHBOARD_PROMEMORIA_COLUMNS,
      filters: (q) => q.is("deleted_at", null).order("event_date", { ascending: true }),
    },
  );

  return queries;
}

async function runRoleBenchmark(role, client) {
  const queries = buildQueries();
  const sequential = [];

  for (const q of queries) {
    sequential.push(await measureRest(client, q.name, () => fetchWithSize(client, q.table, q.select, q.filters)));
  }

  const reportQueries = [
    { name: "report_lavorazioni", table: "lavorazioni", select: SELECT_VARIANTS.lavorazioni_F_report_light, filters: (q) => q.is("deleted_at", null).order("created_at", { ascending: false }) },
    { name: "report_magazzino", table: "magazzino_ricambi", select: MAGAZZINO_REPORT_LIGHT_COLUMNS, filters: (q) => q.order("codice", { ascending: true }) },
    { name: "report_mezzi", table: "mezzi", select: MEZZI_REPORT_LIGHT_COLUMNS, filters: (q) => q.order("created_at", { ascending: false }) },
    { name: "report_movimenti", table: "movimenti_ricambi", select: MOVIMENTI_RICAMBI_COLUMNS, filters: (q) => q.order("created_at", { ascending: false }) },
  ];
  const reportLegacyQueries = [
    { name: "report_lavorazioni_legacy", table: "lavorazioni", select: SELECT_VARIANTS.lavorazioni_D_full, filters: (q) => q.is("deleted_at", null).order("created_at", { ascending: false }) },
    { name: "report_mezzi_legacy", table: "mezzi", select: MEZZI_COLUMNS, filters: (q) => q.order("created_at", { ascending: false }) },
  ];

  const t0 = performance.now();
  const reportResults = await Promise.all(
    reportQueries.map((q) => measureRest(client, q.name, () => fetchWithSize(client, q.table, q.select, q.filters))),
  );
  const parallelMs = Math.round((performance.now() - t0) * 100) / 100;

  const reportLegacyResults = await Promise.all(
    reportLegacyQueries.map((q) => measureRest(client, q.name, () => fetchWithSize(client, q.table, q.select, q.filters))),
  );

  const lavorazioniDualT0 = performance.now();
  const dual = await Promise.all([
    measureRest(client, "lav_attive", () =>
      fetchWithSize(client, "lavorazioni", SELECT_VARIANTS.lavorazioni_D_full, lavorazioniFilters(false)),
    ),
    measureRest(client, "lav_chiuse", () =>
      fetchWithSize(client, "lavorazioni", SELECT_VARIANTS.lavorazioni_D_full, lavorazioniFilters(true)),
    ),
  ]);
  const lavorazioniDualParallelMs = Math.round((performance.now() - lavorazioniDualT0) * 100) / 100;

  const lavorazioniLightT0 = performance.now();
  const dualLight = await Promise.all([
    measureRest(client, "lav_attive_light", () =>
      fetchWithSize(client, "lavorazioni", SELECT_VARIANTS.lavorazioni_E_light_attive, lavorazioniFilters(false)),
    ),
    measureRest(client, "lav_chiuse_light", () =>
      fetchWithSize(client, "lavorazioni", SELECT_VARIANTS.lavorazioni_E_light_attive, lavorazioniFilters(true)),
    ),
  ]);
  const lavorazioniLightParallelMs = Math.round((performance.now() - lavorazioniLightT0) * 100) / 100;

  return {
    role,
    sequential,
    report: { parallelMs, queries: reportResults, legacyQueries: reportLegacyResults },
    lavorazioniScreen: { parallelMs: lavorazioniDualParallelMs, queries: dual },
    lavorazioniScreenLight: { parallelMs: lavorazioniLightParallelMs, queries: dualLight },
  };
}

function computeRlsOverhead(serviceResults, authResults) {
  const overhead = [];
  const serviceMap = new Map(serviceResults.sequential.map((r) => [r.name, r]));
  for (const row of authResults.sequential) {
    const base = serviceMap.get(row.name);
    if (!base || base.error || row.error) continue;
    const deltaMs = Math.round((row.wallMs - base.wallMs) * 100) / 100;
    const pct = base.wallMs > 0 ? Math.round(((row.wallMs - base.wallMs) / base.wallMs) * 1000) / 10 : 0;
    overhead.push({ query: row.name, serviceMs: base.wallMs, authMs: row.wallMs, deltaMs, overheadPct: pct });
  }
  return overhead;
}

async function warmup(client) {
  await client.from("lavorazioni").select("id").limit(1);
}

async function main() {
  const roles = [];
  let adminClient = null;

  if (serviceKey) {
    adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await warmup(adminClient);
    roles.push(await runRoleBenchmark("service", adminClient));
  } else {
    console.error("WARN: no SUPABASE_SERVICE_ROLE_KEY — skipping service role");
  }

  const authTargets = [];

  const adminEmail = env.SMOKE_ADMIN_EMAIL?.trim();
  const adminPassword = env.SMOKE_ADMIN_PASSWORD?.trim();
  if (adminEmail && adminPassword) {
    authTargets.push({ role: "admin", signIn: () => signInClient("admin", adminEmail, adminPassword) });
  }

  const opEmail = env.SMOKE_OPERATOR_EMAIL?.trim();
  const opPassword = env.SMOKE_OPERATOR_PASSWORD?.trim();
  if (opEmail && opPassword) {
    authTargets.push({ role: "operatore", signIn: () => signInClient("operatore", opEmail, opPassword) });
  }

  if (authTargets.length === 0 && adminClient) {
    const profileUsers = await resolveProfileUsers(adminClient);
    for (const u of profileUsers) {
      authTargets.push({
        role: u.role,
        signIn: () => impersonateViaMagicLink(adminClient, u.email),
      });
    }
  }

  for (const target of authTargets) {
    const { client } = await target.signIn();
    await warmup(client);
    roles.push(await runRoleBenchmark(target.role, client));
  }

  const embedAblation = {};
  const serviceSeq = roles.find((r) => r.role === "service")?.sequential ?? [];
  for (const key of Object.keys(SELECT_VARIANTS)) {
    const row = serviceSeq.find((r) => r.name === key);
    if (row) embedAblation[key] = { wallMs: row.wallMs, bytesRaw: row.bytesRaw, rowCount: row.rowCount };
  }

  const rlsOverhead = {};
  const serviceRole = roles.find((r) => r.role === "service");
  for (const authRole of ["admin", "operatore"]) {
    const auth = roles.find((r) => r.role === authRole);
    if (serviceRole && auth) {
      rlsOverhead[authRole] = computeRlsOverhead(serviceRole, auth);
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    projectRef: url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null,
    roles: roles.map((r) => r.role),
    embedAblation,
    rlsOverhead,
    benchmarks: roles,
    baseline: {
      source: "docs/audit-database-performance-explain-post-deploy.md",
      lavorazioni_list_with_mezzo_ms: 902.25,
      report_parallel_ms: 266.28,
    },
  };

  mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
  const outPath = join(process.cwd(), "test-results", "rest-benchmark-roles.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
