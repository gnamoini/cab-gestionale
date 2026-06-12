/**
 * RLS EXPLAIN with authenticated JWT simulation (admin + operatore).
 * Usage: node scripts/ops/rls-explain-authenticated.mjs > test-results/rls-explain-authenticated.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildExplainQueries, RLS_QUERY_IDS, SAMPLE_CLIENTE } from "./lib/explain-queries.mjs";
import { mergedEnv } from "./lib/loadEnv.mjs";
import { parseExplain } from "./lib/parseExplain.mjs";
import { runSql } from "./lib/runSql.mjs";

const ALL_QUERIES = buildExplainQueries(SAMPLE_CLIENTE);
const RLS_QUERIES = ALL_QUERIES.filter((q) => RLS_QUERY_IDS.includes(q.id)).map((q) => ({
  ...q,
  table: q.screen,
  policy: q.screen === "mezzi" ? "cap_mezzi_select + rbac_can_read_row" : q.screen === "log_modifiche" || q.id === "Q16" ? "cap_log_select + rbac_scope" : "cap_lavorazioni_select + rbac_can_read_row",
}));

const env = mergedEnv();

function runExplainMode(q, mode, userId = null) {
  let prefix = "BEGIN; ";
  if (mode === "rls_off") {
    prefix += "SET LOCAL row_security = off; ";
  } else if (mode === "rls_on_postgres") {
    prefix += "SET LOCAL row_security = on; ";
  } else if (mode === "authenticated" && userId) {
    const uid = userId.replace(/'/g, "''");
    prefix += `SET LOCAL role authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', true); SELECT set_config('request.jwt.claim.role', 'authenticated', true); `;
  }
  const sql = `${prefix}EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}; COMMIT;`;
  try {
    const payload = runSql(sql);
    return { ok: true, mode, ...parseExplain(payload) };
  } catch (e) {
    return { ok: false, mode, error: e instanceof Error ? e.message : String(e) };
  }
}

function resolveUserIds() {
  const emails = [];
  const adminEmail = env.SMOKE_ADMIN_EMAIL?.trim();
  const opEmail = env.SMOKE_OPERATOR_EMAIL?.trim();
  if (adminEmail) emails.push(adminEmail);
  if (opEmail) emails.push(opEmail);

  if (emails.length > 0) {
    const inList = emails.map((e) => `'${e.replace(/'/g, "''")}'`).join(", ");
    const payload = runSql(`SELECT id, email, 'smoke' as source FROM auth.users WHERE email IN (${inList})`);
    return payload.rows ?? [];
  }

  const payload = runSql(
    `SELECT DISTINCT ON (p.ruolo) p.id, u.email, p.ruolo as source FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.ruolo IN ('admin', 'operatore') ORDER BY p.ruolo, p.id`,
  );
  return payload.rows ?? [];
}

const userRows = resolveUserIds();
const results = [];

for (const q of RLS_QUERIES) {
  const entry = { ...q, modes: {} };
  entry.modes.rls_off = runExplainMode(q, "rls_off");
  entry.modes.rls_on_postgres = runExplainMode(q, "rls_on_postgres");
  for (const u of userRows) {
    const roleKey =
      u.source === "admin" || u.source === "operatore"
        ? `authenticated_${u.source}`
        : u.email === env.SMOKE_ADMIN_EMAIL?.trim()
          ? "authenticated_admin"
          : "authenticated_operatore";
    entry.modes[roleKey] = {
      userId: u.id,
      email: u.email,
      ...runExplainMode(q, "authenticated", u.id),
    };
  }
  results.push(entry);
}

const out = {
  generatedAt: new Date().toISOString(),
  users: userRows,
  results,
};

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
writeFileSync(join(process.cwd(), "test-results", "rls-explain-authenticated.json"), JSON.stringify(out, null, 2));
process.stdout.write(JSON.stringify(out, null, 2));
