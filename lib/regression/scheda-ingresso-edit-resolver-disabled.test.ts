import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const prompt = read("src/hooks/use-scheda-ingresso-mezzo-prompt.ts");
assert.match(prompt, /linkState\.linkedSnapshot\) return/);
assert.match(prompt, /resolverDisabled/);

const anagrafica = read("components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx");
assert.match(anagrafica, /isPreventivoSurface \|\| mezzoLinked/);
assert.match(anagrafica, /ambiguousMatchHandler = isPreventivoSurface \|\| mezzoLinked/);

console.log("scheda-ingresso-edit-resolver-disabled.test.ts: ok");
