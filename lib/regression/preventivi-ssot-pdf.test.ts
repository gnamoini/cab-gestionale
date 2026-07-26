import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20261029120000_preventivi_ssot_pdf.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20261029120100_ddt_pdf_artifact_commit.sql")));

const migration = read("supabase/migrations/20261029120000_preventivi_ssot_pdf.sql");
assert.match(migration, /create table if not exists public\.pdf_artifacts/);
assert.match(migration, /commit_preventivo_status_transition/);
assert.match(migration, /is_preventivo_visible_to_client/);
assert.match(migration, /document_access_tokens/);
assert.match(migration, /delete from public\.lavorazione_documents/);

const transition = read("lib/preventivi/preventivo-status-transition.server.ts");
assert.match(transition, /to === "inviato"/);
assert.doesNotMatch(transition, /to === "confermato"[\s\S]*generatePreventivoPdfBytes/);
assert.match(transition, /emitPreventivoStatusChanged/);
assert.match(transition, /commit_preventivo_status_transition/);

const ddtPersist = read("lib/ddt/ddt-official-pdf.server.ts");
assert.match(ddtPersist, /commit_ddt_pdf_artifact/);
assert.match(ddtPersist, /generateDdtPdfBytes/);

const preventiviView = read("components/preventivi/preventivi-view.tsx");
assert.match(preventiviView, /PreventivoStatusCell/);
assert.match(preventiviView, /transitionStatus/);

const previewPreventivo = read("app/(gestionale)/documenti/preventivo/[id]/preview/page.tsx");
assert.match(previewPreventivo, /OfficialDocumentPreviewShell/);
assert.match(previewPreventivo, /official-documents\/preventivo/);

const clientResolver = read("lib/official-documents/client/resolve-client-documents.server.ts");
assert.match(clientResolver, /buildClientOfficialDocumentPreviewPath\(token\.token\)/);
assert.doesNotMatch(clientResolver, /buildStaffOfficialDocumentPreviewPath/);

const staffResolver = read("lib/official-documents/staff/resolve-staff-documents.server.ts");
assert.match(staffResolver, /buildStaffOfficialDocumentPreviewPath/);

assert.ok(!fs.existsSync(path.join(ROOT, "components/gestionale/media/lavorazione-documents-manager.tsx")));

const uploadPolicy = read("app/api/documents/upload-policy/route.ts");
assert.match(uploadPolicy, /status: 410/);

console.log("preventivi-ssot-pdf.test.ts OK");
