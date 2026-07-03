import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function grepImports(dir: string): string {
  const files: string[] = [];
  function walk(d: string) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name)) files.push(fs.readFileSync(p, "utf8"));
    }
  }
  walk(path.join(ROOT, dir));
  return files.join("\n");
}

const lavCorePaths = [
  "src/services/lavorazioni.service.ts",
  "src/hooks/gestionale/use-lavorazione-mutations.ts",
];
const lavCore = [
  ...lavCorePaths.map((f) => read(f)),
  grepImports("lib/lavorazioni"),
].join("\n");

assert.doesNotMatch(lavCore, /workshop-schedule/);
assert.doesNotMatch(lavCore, /workshop_schedule/);

const agendaUi = grepImports("components/workshop-schedule");
assert.doesNotMatch(agendaUi, /lavorazioni\.service/);
assert.doesNotMatch(agendaUi, /lavorazioniDomainQueryKeys/);

console.log("workshop-schedule-bounded-context.test.ts OK");
