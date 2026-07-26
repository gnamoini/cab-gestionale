import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function grepFiles(dir: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      hits.push(...grepFiles(rel, pattern));
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    const content = read(rel);
    if (pattern.test(content)) hits.push(rel);
  }
  return hits;
}

// Modal manuale eliminato
assert.equal(
  fs.existsSync(path.join(ROOT, "components/gestionale/mezzi/mezzi-registra-tagliando-modal.tsx")),
  false,
  "mezzi-registra-tagliando-modal.tsx must be deleted",
);

// Hub tab non importa modal registrazione
const hubTab = read("components/gestionale/mezzi/mezzi-hub-tagliandi-tab.tsx");
assert.doesNotMatch(hubTab, /MezziRegistraTagliandoModal/);
assert.doesNotMatch(hubTab, /useRegisterExecutionV2Mutation/);
assert.doesNotMatch(hubTab, /Registra tagliando/i);

// Nessun altro componente UI importa il modal eliminato
const modalImports = grepFiles("components", /mezzi-registra-tagliando-modal/);
assert.equal(modalImports.length, 0, `unexpected modal imports: ${modalImports.join(", ")}`);

// RPC integrato presente
const migration = read("supabase/migrations/20261027120000_tagliandi_integrati_lavorazioni.sql");
assert.match(migration, /complete_lavorazione_tagliando/);
assert.match(migration, /maintenance_events/);

console.log("tagliandi-no-manual-registration-audit.test.ts OK");
