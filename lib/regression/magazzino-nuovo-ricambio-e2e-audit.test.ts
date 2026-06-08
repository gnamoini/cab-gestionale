/**
 * Wiring E2E Nuovo Ricambio — spec 14 in PR gate + helper smoke.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const specPath = "e2e/smoke/14-magazzino-nuovo-ricambio.spec.ts";
assert.ok(fs.existsSync(path.join(ROOT, specPath)), `${specPath} must exist`);

const spec = read(specPath);
assert.match(spec, /createRicambioLenientSmoke/);
assert.match(spec, /adminCredentials/);

const helper = read("e2e/helpers/magazzino-ricambio.ts");
assert.match(helper, /Nuovo ricambio/);

const pwConfig = read("e2e/playwright.config.ts");
assert.match(pwConfig, /14-magazzino-nuovo-ricambio/);

const pkg = read("package.json");
assert.match(pkg, /smoke:playwright:ricambio:smoke/);
assert.match(pkg, /playwright\.ricambio-cert\.config\.ts/);

const workflow = read(".github/workflows/release-gate.yml");
assert.match(workflow, /smoke:playwright:ricambio:smoke/);

console.log("magazzino-nuovo-ricambio-e2e-audit.test.ts OK");
