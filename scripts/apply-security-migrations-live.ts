/**
 * Apply security migrations one-by-one with stop-on-failure.
 * Usage: npx tsx scripts/apply-security-migrations-live.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const ORDER = [
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

function applyFile(file: string): boolean {
  const full = path.join(MIGRATIONS_DIR, file);
  if (!fs.existsSync(full)) {
    console.error("MISSING", file);
    return false;
  }
  console.log("APPLY", file);
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", full], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    console.error(r.stdout ?? "");
    console.error(r.stderr ?? "");
    return false;
  }
  return true;
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    for (const f of ORDER) console.log("would apply:", f);
    return;
  }

  for (const file of ORDER) {
    if (!applyFile(file)) {
      console.error("STOP on failure:", file);
      process.exit(1);
    }
  }
  console.log("all migrations applied OK");
}

main();
