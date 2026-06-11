/**
 * Audit rollout sheet searchable — domain-based v2, OFF su report/security default.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const engine = read("lib/selector-core/selector-decision-engine.ts");
const engineConfig = read("lib/selector-core/selector-engine-config.ts");
const configSnapshot = read("lib/selector-core/selector-config-snapshot.ts");
const domainPolicy = read("lib/selector-core/selector-domain-policy.ts");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");

assert.match(domainPolicy, /SELECTOR_SHEET_ROLLOUT_BY_DOMAIN/);
assert.match(configSnapshot, /report: "DISABLED"/);
assert.match(engine, /isSelectorDomainSheetRolloutEnabled/);
assert.match(engineConfig, /SELECTOR_SHEET_ROLLOUT_BY_DOMAIN/);
assert.match(globalSelect, /selectorDomain/);
assert.match(globalSelect, /resolvedMobileSheetMode/);
assert.match(globalSelect, /isSelectorDomainSheetRolloutEnabled/);

const componentsDir = path.join(ROOT, "components");
function scanDir(dir: string): string[] {
  const hits: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...scanDir(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      const src = fs.readFileSync(full, "utf8");
      if (/mobileSheetMode\s*=\s*["']searchable["']/.test(src)) {
        hits.push(path.relative(ROOT, full));
      }
    }
  }
  return hits;
}

const prodSearchable = scanDir(componentsDir).filter(
  (f) => !f.includes("global-select.tsx"),
);
assert.equal(
  prodSearchable.length,
  0,
  `Unexpected mobileSheetMode=searchable in: ${prodSearchable.join(", ")}`,
);

console.log("selector-rollout-safety-audit.test.ts OK");
