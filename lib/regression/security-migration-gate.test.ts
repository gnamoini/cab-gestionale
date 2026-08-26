/**
 * Gate: remediation migrations present; no new 20261226+ GRANT EXECUTE TO anon without allowlist.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const REQUIRED_REMEDIATION = [
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

const GATE_PREFIX = "20261226";
const GRANT_ANON_RE = /grant\s+execute\s+[^;]*\bto\s+[^;]*\banon\b/i;
const ALLOWLIST_RE = /security-allowlist:/i;

for (const file of REQUIRED_REMEDIATION) {
  assert.ok(
    fs.existsSync(path.join(MIGRATIONS_DIR, file)),
    `missing remediation migration: ${file}`,
  );
}

const violations: string[] = [];
const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql") && f >= `${GATE_PREFIX}`)
  .sort();

for (const file of migrationFiles) {
  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!GRANT_ANON_RE.test(line)) continue;
    const window = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
    if (!ALLOWLIST_RE.test(window)) {
      violations.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  }
}

assert.equal(violations.length, 0, `GRANT EXECUTE TO anon without security-allowlist:\n${violations.join("\n")}`);

console.log(
  `security-migration-gate.test: OK (${REQUIRED_REMEDIATION.length} remediation migrations, ${migrationFiles.length} gated files scanned)`,
);
