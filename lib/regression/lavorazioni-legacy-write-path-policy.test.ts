/**
 * Policy: nessun percorso legacy nel write path lavorazioni.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const lavFiles = [
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/gestionale/lavorazioni/lavorazione-create-modal.tsx",
  "components/gestionale/lavorazioni/lavorazione-edit-modal.tsx",
  "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx",
].map(read).join("\n");
const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const createModal = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");

// Nessuna whitelist ruolo hardcoded nei componenti lavorazioni
assert.doesNotMatch(
  lavFiles,
  /role_key\s*===\s*['"]manager['"]|ruolo\s*===\s*['"]operatore['"]|['"]admin['"]\s*,\s*['"]operatore['"]/,
  "no role whitelist in lavorazioni components",
);

// UI non chiama service diretto (solo entry via hook/transaction deps)
assert.doesNotMatch(lavView, /lavorazioniService\.(create|update|conclude)/);
assert.doesNotMatch(createModal, /lavorazioniEntry\.create/);
assert.doesNotMatch(createModal, /dispatchGestionaleLocalMutation\(qc,\s*\[["']lavorazioni["']\]/);

// Guard coerente create vs update
assert.match(read("lib/domain/intervento-entry.ts"), /ensurePageWrite\("lavorazioni"\)/);
assert.match(read("lib/domain/lavorazioni-entry.ts"), /ensurePageWrite\("lavorazioni"\)/);

// Mutation SSOT
assert.match(read("src/hooks/gestionale/use-lavorazione-mutations.ts"), /lavorazioniEntry\.(create|update|conclude)/);

console.log("lavorazioni-legacy-write-path-policy.test.ts OK");
