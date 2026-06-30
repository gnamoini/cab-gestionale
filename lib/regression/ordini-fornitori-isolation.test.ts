import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const preventiviView = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");
const ordiniView = fs.readFileSync(path.join(ROOT, "components/ordini-fornitori/ordini-fornitori-view.tsx"), "utf8");
const queryKeys = fs.readFileSync(path.join(ROOT, "src/lib/react-query/query-keys.ts"), "utf8");
const pdfGen = fs.readFileSync(path.join(ROOT, "lib/pdf-artifacts/pdf-artifact-generate.server.ts"), "utf8");
const pdfRegistry = fs.readFileSync(path.join(ROOT, "lib/pdf-artifacts/pdf-artifact-registry.ts"), "utf8");

assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260731120000_ordini_fornitori_module.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260731120100_user_permissions_ordini_fornitori.sql")));

assert.match(preventiviView, /OrdiniFornitoriView/);
assert.match(preventiviView, /Q_PREVENTIVI_TAB/);
assert.doesNotMatch(ordiniView, /usePreventiviRecordsQuery/);
assert.doesNotMatch(ordiniView, /QK\.preventivi/);

assert.match(queryKeys, /ordiniFornitori/);
assert.doesNotMatch(queryKeys, /ordiniFornitori[\s\S]*preventivi/);

assert.match(pdfGen, /case "ordine-fornitore"/);
assert.match(pdfRegistry, /"ordine-fornitore"/);

console.log("ordini-fornitori-isolation.test.ts OK");
