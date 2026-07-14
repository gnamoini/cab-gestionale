/**
 * Fatturazione RBAC — parity page WRITE vs RLS + guard chain.
 * BLOCKER: migration fatturazione user-facing non devono reintrodurre admin senza whitelist.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { canWrite } from "@/lib/auth/rbac";
import type { RequiredRbacContext } from "@/lib/auth/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

const USER_FACING_TABLES = [
  "invoices",
  "invoice_rows",
  "invoice_links",
  "invoice_payments",
  "billing_settings",
  "invoice_number_sequences",
  "invoice_fatturapa_snapshots",
  "invoice_sdi_submissions",
  "invoice_public_administration_meta",
  "customer_open_items",
  "customer_payments",
  "payment_allocations",
] as const;

const ADMIN_WHITELIST_PATTERNS = [
  /apply_invoice_status_backfill/,
  /apply_invoice_axes_backfill/,
  /invoice_status_migration_report/,
];

function fatturazioneMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.includes("fatturazione") && f.endsWith(".sql"))
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

const ALIGNMENT_BASE = "20260915120200_fatturazione_write_rls_alignment.sql";

function isPostAlignmentMigration(filePath: string): boolean {
  return path.basename(filePath) > ALIGNMENT_BASE;
}

function isWhitelistedAdminContext(snippet: string): boolean {
  return ADMIN_WHITELIST_PATTERNS.some((re) => re.test(snippet));
}

// --- BLOCKER: admin su tabelle user-facing (solo migration DOPO alignment) ---
for (const file of fatturazioneMigrationFiles()) {
  if (!isPostAlignmentMigration(file)) continue;
  const sql = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  const adminRe = /rbac_module_can\s*\(\s*'fatturazione'\s*,\s*'admin'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = adminRe.exec(sql)) !== null) {
    const start = Math.max(0, match.index - 400);
    const end = Math.min(sql.length, match.index + 400);
    const context = sql.slice(start, end);
    const touchesUserTable = USER_FACING_TABLES.some((t) => context.includes(t));
    if (touchesUserTable && !isWhitelistedAdminContext(context)) {
      assert.fail(
        `${rel}: rbac_module_can('fatturazione','admin') su tabella user-facing senza whitelist — ${context.slice(0, 120)}…`,
      );
    }
  }
}

// --- Alignment migration presente ---
const alignment = path.join(MIGRATIONS_DIR, ALIGNMENT_BASE);
assert.ok(fs.existsSync(alignment), "migration fatturazione_write_rls_alignment mancante");
const alignmentSql = fs.readFileSync(alignment, "utf8");
assert.match(alignmentSql, /cap_invoices_delete[\s\S]*rbac_module_can\('fatturazione', 'write'\)/);
assert.match(alignmentSql, /status in \('bozza', 'da_verificare'\)/);
assert.match(alignmentSql, /cap_billing_settings[\s\S]*with check \(public\.rbac_module_can\('fatturazione', 'write'\)\)/);
assert.match(alignmentSql, /cap_invoice_number_sequences_write[\s\S]*'write'/);
assert.match(
  alignmentSql,
  /cancel_invoice[\s\S]*rbac_module_can\('fatturazione', 'write'\)[\s\S]*invoice_apply_transition/,
);

// --- cancel_invoice guard prima della transition ---
const cancelGuard = alignmentSql.slice(alignmentSql.indexOf("create or replace function public.cancel_invoice"));
assert.match(cancelGuard, /if not public\.rbac_module_can\('fatturazione', 'write'\)/);
const guardIdx = cancelGuard.indexOf("rbac_module_can('fatturazione', 'write')");
const transitionIdx = cancelGuard.indexOf("invoice_apply_transition");
assert.ok(guardIdx >= 0 && transitionIdx > guardIdx, "cancel_invoice: guard write deve precedere transition");

// --- invoicesEntry guard chain ---
const entry = fs.readFileSync(path.join(ROOT, "lib/domain/invoices-entry.ts"), "utf8");
for (const method of ["create", "updateDraft", "updateDraftWithRows", "issue", "registerPayment", "cancel", "remove"]) {
  assert.match(entry, new RegExp(`${method}:\\s*withPageWriteGuard\\("fatturazione"`));
}

// --- Resolver parity ruoli ---
function fatturazioneWrite(roleKey: string): boolean {
  const snap = buildTestSnapshot({ userId: `u-${roleKey}`, roleKey });
  return canWrite(roleKey, "fatturazione", snap.rbacContext as RequiredRbacContext);
}

assert.equal(fatturazioneWrite("manager"), true, "manager write fatturazione");
assert.equal(fatturazioneWrite("addetto_amministrativo"), true, "addetto_amministrativo write fatturazione");
assert.equal(fatturazioneWrite("operatore"), false, "operatore no write fatturazione");
assert.equal(fatturazioneWrite("guest"), false, "guest no write fatturazione");
assert.equal(fatturazioneWrite("cliente"), false, "cliente no write fatturazione");

console.log("fatturazione-rbac-write-parity.test.ts OK");
