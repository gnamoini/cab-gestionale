/**
 * API route authz audit: verifyServer* / getServerSession at route layer, or documented alt auth.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PRIMARY_AUTH_RE = /verifyServer\w*\(|getServerSession\(/;
const ALT_AUTH_RE =
  /requireDocumentCaptureAuth|resolveServerEffectivePermissions|verifyMediaImagePathAccess|deliverDocumentFile|assertImportFile|CRON_SECRET|verifyResendWebhookSignature|verifyOpsAccess|verifyAdminAccess|requireOpsAccess|handleSdiWebhook|createCommunicationAdminClient|streamOfficialDocument|officialDocumentToken|requireImportAuth|verifyImportAccess|handleReport\w+|from "@\/lib\/(report|export|preventivi|ordini-fornitori|inventory-labels|mezzo-labels|maintenance|ops|notifications\/preferences|pdf|fatturazione|import)/;
const DEPRECATED_RE = /status:\s*410|DEPRECATED_ENDPOINT/;

const PUBLIC_PREFIXES = [
  "app/api/cron/",
  "app/api/webhooks/",
  "app/api/branding/",
  "app/api/fatturazione/sdi-webhook/",
  "app/api/official-documents/token/",
] as const;

/** Routes without verifyServer/getServerSession at route.ts — alt auth or delegation (frozen baseline). */
const KNOWN_UNGUARDED_ROUTES = new Set([
  "app/api/communications/test-send/route.ts",
  "app/api/ddt/[id]/official-pdf/route.ts",
  "app/api/documents/[id]/preview/route.ts",
  "app/api/export/jobs/[id]/route.ts",
  "app/api/import/batches/[id]/recover/route.ts",
  "app/api/import/clienti/execute/route.ts",
  "app/api/import/clienti/parse/route.ts",
  "app/api/import/clienti/preview/route.ts",
  "app/api/import/clienti/template/route.ts",
  "app/api/import/entities/route.ts",
  "app/api/import/magazzino/execute/route.ts",
  "app/api/import/magazzino/parse/route.ts",
  "app/api/import/magazzino/preview/route.ts",
  "app/api/import/magazzino/template/route.ts",
  "app/api/import/presets/route.ts",
  "app/api/import/[entity]/template/route.ts",
  "app/api/magazzino/receiving/route.ts",
  "app/api/report/operational-assistant/route.ts",
  "app/api/report/operational-brief/history/route.ts",
  "app/api/report/operational-brief/pdf/route.ts",
  "app/api/report/operational-brief/route.ts",
  "app/api/auth/request-password-reset/route.ts",
]);

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
}

const routes: string[] = [];
walk(path.join(ROOT, "app/api"), routes);

const flaggedKnown: string[] = [];
const surprises: string[] = [];
let primaryGuarded = 0;

for (const file of routes) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");

  if (PRIMARY_AUTH_RE.test(src)) {
    primaryGuarded += 1;
    continue;
  }

  if (PUBLIC_PREFIXES.some((p) => rel.startsWith(p))) continue;
  if (ALT_AUTH_RE.test(src) || DEPRECATED_RE.test(src)) continue;
  if (KNOWN_UNGUARDED_ROUTES.has(rel)) {
    flaggedKnown.push(rel);
    continue;
  }

  surprises.push(rel);
}

assert.equal(surprises.length, 0, `unguarded API routes (no verifyServer/getServerSession):\n${surprises.join("\n")}`);

console.log(
  `api-route-authz-audit.test: OK (${primaryGuarded} primary-guarded, ${flaggedKnown.length} known-alt-auth routes)`,
);
