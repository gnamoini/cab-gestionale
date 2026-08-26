/**
 * Preflight report before applying security migrations (read-only).
 * Usage: npx tsx scripts/security-remediation-preflight.ts [--out docs/security/preflight-2026-08-27.json]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const PENDING = [
  "20261226120100_security_definer_default_acl_ssot.sql",
  "20261226120200_security_definer_grants_reconcile.sql",
  "20261226120201_security_definer_grants_from_manifest.sql",
  "20261226120300_security_rls_operative_history_p0.sql",
  "20261226120400_security_rls_metadata_hardening.sql",
  "20261226120500_security_rpc_body_guards_p0.sql",
  "20261226120600_security_storage_path_acl.sql",
  "20261226120700_ordine_fornitore_status_transition_guard.sql",
  "20261226120800_document_access_token_entropy.sql",
  "20261226120900_ai_part_search_owner_rls.sql",
  "20261226121000_security_rpc_body_guards_gap.sql",
  "20261226121100_single_writer_transaction_flags.sql",
  "20261226121200_import_commit_dedup.sql",
  "20261226121300_communication_delivery_idempotency.sql",
  "20261226121400_ai_part_search_worker_lease.sql",
] as const;

function runSql(sql: string): unknown[] | null {
  const tmp = path.join(ROOT, ".tmp-preflight.sql");
  fs.writeFileSync(tmp, sql);
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  fs.unlinkSync(tmp);
  if (r.status !== 0) return null;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const m = out.match(/\[[\s\S]*\]/);
  return m ? (JSON.parse(m[0]) as unknown[]) : null;
}

function main(): void {
  const outIdx = process.argv.indexOf("--out");
  const outPath =
    outIdx >= 0
      ? path.resolve(process.argv[outIdx + 1]!)
      : path.join(ROOT, "docs/security/preflight-2026-08-27.json");

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: Record<string, { classification: string }>;
  };

  const versionRow = runSql(`
    select coalesce(json_agg(row_to_json(t)), '[]'::json)::text as j from (
      select version from supabase_migrations.schema_migrations order by version desc limit 1
    ) t;
  `);
  const currentVersion =
    versionRow && Array.isArray(versionRow) && versionRow[0]
      ? String((versionRow[0] as { version?: string }).version ?? "unknown")
      : "offline";

  const fnStats = runSql(`
    select coalesce(json_agg(row_to_json(t)), '[]'::json)::text as j from (
      select
        count(*) filter (where has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_exec_definer_total,
        count(*) filter (where has_function_privilege('public', p.oid, 'EXECUTE')) as public_exec_definer_total,
        count(*) filter (
          where has_function_privilege('anon', p.oid, 'EXECUTE')
            and (
              pg_get_functiondef(p.oid) ~* '\\m(insert|update|delete|truncate)\\M'
              or pg_get_functiondef(p.oid) ilike '%perform net.http%'
            )
        ) as mutating_anon_exec
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
    ) t;
  `);

  const aclRow = runSql(`
    select coalesce(json_agg(row_to_json(t)), '[]'::json)::text as j from (
      select defaclrole::regrole::text as grantor, defaclacl::text
      from pg_default_acl d
      join pg_namespace n on n.oid = d.defaclnamespace
      where defaclobjtype = 'f' and n.nspname = 'public'
    ) t;
  `);

  const stats =
    fnStats && fnStats[0]
      ? (fnStats[0] as Record<string, number>)
      : { anon_exec_definer_total: null, public_exec_definer_total: null, mutating_anon_exec: null };

  const report = {
    generatedAt: new Date().toISOString(),
    current_migration_version: currentVersion,
    pending_migrations: PENDING.filter((f) => fs.existsSync(path.join(MIGRATIONS_DIR, f))),
    manifest_entries: Object.keys(manifest.entries).length,
    functions_affected: stats,
    default_acl_before: aclRow ?? [],
    expected_breaking_changes: [
      "anon EXECUTE revoked on ~109 SECURITY DEFINER functions",
      "PUBLIC EXECUTE revoked (invoice_write_status_axes, cab_invoke_*, etc.)",
      "Direct UPDATE ordini_fornitori.status blocked outside canonical RPC",
      "cliente role blocked on staff /api/* at edge",
    ],
    triggers_to_add: [
      "ordini_fornitori_status_guard",
      "import_commit_dedup PK",
      "communication delivery_operation_id",
      "ai_part_search lease columns",
    ],
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("preflight →", outPath);
}

main();
