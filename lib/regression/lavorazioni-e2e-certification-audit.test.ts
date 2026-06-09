/**
 * Audit statico: wiring certificazione E2E Lavorazioni / Scheda Ingresso.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

assert.ok(exists("e2e/fixtures/scheda-ingresso-test-data.ts"));
assert.ok(exists("e2e/helpers/lavorazioni-scheda.ts"));
assert.ok(exists("e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts"));
assert.ok(exists("scripts/verify-lavorazione-audit-db.ts"));

const pwCertConfig = read("e2e/playwright.mobile-cert.config.ts");
assert.match(pwCertConfig, /mobile-android/);
assert.match(pwCertConfig, /mobile-ios-chromium/);
assert.match(pwCertConfig, /mobile-ios/);
assert.match(pwCertConfig, /tablet-ios/);
assert.match(pwCertConfig, /13-lavorazioni-scheda-ingresso/);

const pwConfig = read("e2e/playwright.config.ts");
assert.match(pwConfig, /13-lavorazioni-scheda-ingresso\.spec\.ts/);
assert.match(pwConfig, /testIgnore/);

const spec = read("e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts");
assert.match(spec, /fillMinimalCreateAndSaveWithoutClienteBlur/);
assert.match(spec, /attachSchedaPayloadCapture/);
const helpers = read("e2e/helpers/lavorazioni-scheda.ts");
assert.match(helpers, /Salva lavorazione/);
assert.match(helpers, /clickNuovaLavorazioneCta/);
assert.doesNotMatch(helpers, /keyboard\.press\(["']Escape["']\)/);
assert.match(helpers, /listboxForCombobox|aria-controls/);

const fixture = read("e2e/fixtures/scheda-ingresso-test-data.ts");
assert.match(fixture, /SCHEDA_INGRESSO_DB_KEYS/);
assert.match(fixture, /uniqueAuditToken/);

const verifyScript = read("scripts/verify-lavorazione-audit-db.ts");
assert.match(verifyScript, /scheda_lavorazione/);
assert.match(verifyScript, /SCHEDA_INGRESSO_DB_KEYS/);

const pkg = read("package.json");
assert.match(pkg, /smoke:playwright:scheda-smoke/);
assert.match(pkg, /smoke:playwright:cert.*iOS regression/);

const certWorkflow = read(".github/workflows/release-gate-cert.yml");
assert.match(certWorkflow, /smoke:playwright:scheda-smoke/);
assert.doesNotMatch(read(".github/workflows/release-gate.yml"), /smoke:playwright:scheda-smoke/);
assert.doesNotMatch(read(".github/workflows/release-gate.yml"), /smoke:playwright:ios-smoke/);

console.log("lavorazioni-e2e-certification-audit.test.ts OK");
