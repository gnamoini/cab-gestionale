/**
 * Identifica Ricambio — static policy gate (route, API authz, page metadata).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GESTIONALE_ROUTE_TITLES } from "@/lib/site/app-page-metadata";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app/api/identifica-ricambio");

const REQUIRED_API_ROUTES = [
  "searches/route.ts",
  "searches/[id]/route.ts",
  "searches/[id]/start/route.ts",
  "searches/[id]/confirm/route.ts",
  "searches/[id]/reject/route.ts",
  "uploads/policy/route.ts",
] as const;

const AUTH_RE =
  /verifyServerPage(Read|Write)\(\s*["']identifica_ricambio["']\)|verifyServer\w*\(|getServerSession\(/;

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

for (const rel of REQUIRED_API_ROUTES) {
  const abs = path.join(API_ROOT, rel);
  assert.ok(fs.existsSync(abs), `missing API route: app/api/identifica-ricambio/${rel}`);
  const src = fs.readFileSync(abs, "utf8");
  assert.match(src, AUTH_RE, `API auth guard missing: identifica-ricambio/${rel}`);
}

const page = read("app/(gestionale)/identifica-ricambio/page.tsx");
assert.match(page, /identificaRicambioPageMetadata\s+as\s+metadata/, "page must export SSOT metadata");
assert.match(page, /IdentificaRicambioViewLazy/, "page must render identifica ricambio view");

assert.ok("/identifica-ricambio" in GESTIONALE_ROUTE_TITLES, "GESTIONALE_ROUTE_TITLES missing /identifica-ricambio");

const view = read("components/gestionale/identifica-ricambio/identifica-ricambio-view.tsx");
assert.match(view, /identifica_ricambio|identifica-ricambio/i, "view must reference identifica ricambio module");

console.log("identifica-ricambio-policy: ok");
