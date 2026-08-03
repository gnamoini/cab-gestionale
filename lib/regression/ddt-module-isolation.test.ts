import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

assert.ok(!fs.existsSync(path.join(ROOT, "app/(gestionale)/ddt/page.tsx")));
assert.ok(!fs.existsSync(path.join(ROOT, "components/ddt/ddt-view.tsx")));
assert.ok(!fs.existsSync(path.join(ROOT, "components/ddt/ddt-from-preventivo-wizard-modal.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/ddt/ddt-preventivo-panel.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260720120000_ddt_module.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260720120100_user_permissions_ddt.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260721120000_ddt_one_per_preventivo.sql")));

const preventiviView = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");
assert.match(preventiviView, /openDdtPdfInNewTab/);
assert.match(preventiviView, /buildDdtDraftFromPreventivoAuto/);
assert.match(preventiviView, /usePreventivoDdtIndex/);
assert.doesNotMatch(preventiviView, /ddt-from-preventivo-wizard-modal/);

const nav = fs.readFileSync(path.join(ROOT, "components/gestionale/gestionale-nav-config.tsx"), "utf8");
assert.doesNotMatch(nav, /href: "\/ddt"/);

const draft = fs.readFileSync(path.join(ROOT, "lib/ddt/preventivo-to-ddt-draft.ts"), "utf8");
assert.match(draft, /buildDdtDraftFromPreventivoAuto/);

const pdfGen = fs.readFileSync(path.join(ROOT, "lib/pdf-artifacts/pdf-artifact-generate.server.ts"), "utf8");
assert.match(pdfGen, /case "ddt"/);

const pdfRbac = fs.readFileSync(path.join(ROOT, "lib/pdf-artifacts/pdf-artifact-rbac.server.ts"), "utf8");
assert.match(pdfRbac, /verifyServerPageRead\("preventivi"\)/);

const pdfRegistry = fs.readFileSync(path.join(ROOT, "lib/pdf-artifacts/pdf-artifact-registry.ts"), "utf8");
assert.match(pdfRegistry, /"ddt"/);

const lavDocs = fs.readFileSync(path.join(ROOT, "lib/lavorazioni/lavorazione-documents.ts"), "utf8");
assert.doesNotMatch(lavDocs, /tipo: "ddt"/);

const ddtPdf = fs.readFileSync(path.join(ROOT, "lib/ddt/ddt-pdf-generate.ts"), "utf8");
assert.doesNotMatch(ddtPdf, /prezzo|IVA|totale/i);
assert.match(ddtPdf, /drawGestionaleDataSectionTable/);
assert.match(ddtPdf, /drawGestionaleCompactFieldSectionTable/);
assert.match(ddtPdf, /drawGestionaleTripleFieldSectionTable/);

const ddtDrawer = fs.readFileSync(path.join(ROOT, "components/ddt/ddt-detail-drawer.tsx"), "utf8");
assert.match(ddtDrawer, /openDdtPdfInNewTab/);
assert.doesNotMatch(ddtDrawer, /window\.location\.assign/);

console.log("ddt-module-isolation.test.ts OK");
