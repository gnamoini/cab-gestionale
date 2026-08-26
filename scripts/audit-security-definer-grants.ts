/**
 * Audit rpc-access-manifest vs baseline — no anon grants, print coverage gaps.
 * Usage: npx tsx scripts/audit-security-definer-grants.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/security/rpc-access-manifest.json");
const BASELINE_PATH = path.join(ROOT, "docs/security/baseline-pre-remediation-2026-08-26.json");

type BaselineFn = { name: string; args: string };
type ManifestEntry = { anonAllow?: boolean; grants?: string[] };

function fnKey(name: string, args: string): string {
  return args ? `${name}(${args})` : `${name}()`;
}

function main(): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Missing manifest: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`Missing baseline: ${BASELINE_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: Record<string, ManifestEntry>;
  };
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as {
    functions: BaselineFn[];
    summary?: { securityDefinerCount?: number; anonExecuteCount?: number };
  };

  const anonViolations: string[] = [];
  for (const [key, entry] of Object.entries(manifest.entries)) {
    if (entry.anonAllow) anonViolations.push(`${key}: anonAllow=true`);
    if (entry.grants?.includes("anon")) anonViolations.push(`${key}: grants include anon`);
  }

  const baselineKeys = new Set(baseline.functions.map((f) => fnKey(f.name, f.args)));
  const manifestKeys = new Set(Object.keys(manifest.entries));

  const missingInManifest = [...baselineKeys].filter((k) => !manifestKeys.has(k)).sort();
  const extraInManifest = [...manifestKeys].filter((k) => !baselineKeys.has(k)).sort();

  console.log("=== Security DEFINER grants audit ===\n");
  console.log(`Baseline functions: ${baselineKeys.size}`);
  console.log(`Manifest entries:   ${manifestKeys.size}`);
  if (baseline.summary) {
    console.log(
      `Baseline anon EXECUTE (pre-remediation): ${baseline.summary.anonExecuteCount ?? "?"}`,
    );
  }

  if (anonViolations.length > 0) {
    console.error(`\nFAIL: ${anonViolations.length} manifest anon grant violation(s):`);
    for (const v of anonViolations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log("\nOK: manifest has zero anonAllow / anon grants");

  if (missingInManifest.length > 0) {
    console.error(`\nGAP: ${missingInManifest.length} baseline function(s) missing from manifest:`);
    for (const k of missingInManifest.slice(0, 20)) console.error(`  - ${k}`);
    if (missingInManifest.length > 20) console.error(`  ... +${missingInManifest.length - 20} more`);
    process.exit(1);
  }

  if (extraInManifest.length > 0) {
    console.log(`\nNote: ${extraInManifest.length} manifest entry(ies) not in baseline (OK if post-baseline additions)`);
    for (const k of extraInManifest.slice(0, 5)) console.log(`  + ${k}`);
    if (extraInManifest.length > 5) console.log(`  ... +${extraInManifest.length - 5} more`);
  }

  console.log("\naudit-security-definer-grants: OK");
}

main();
