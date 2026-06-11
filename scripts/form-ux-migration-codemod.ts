/**
 * Suggest-only codemod with MAP governance labels.
 * Default dry-run. Apply with --write (allowlist only, manual review).
 *
 * Usage:
 *   npx tsx scripts/form-ux-migration-codemod.ts
 *   npx tsx scripts/form-ux-migration-codemod.ts --json
 *   npx tsx scripts/form-ux-migration-codemod.ts --write
 */
import fs from "node:fs";
import path from "node:path";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { CodemodDisposition } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import {
  scanMigrationInventory,
  type MigrationInventoryField,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { INPUT_KIND_SSOT } from "@/lib/form-ux-migration/registry";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const JSON_OUT = process.argv.includes("--json");

type AllowlistConfig = { files: string[] };

type CodemodSuggestion = {
  file: string;
  line: number;
  fieldId: string;
  formId: string;
  disposition: CodemodDisposition;
  dispositionLabel: string;
  tier: number;
  tierLabel: string;
  signals: string[];
  original: string;
  suggestion: string;
};

const DISPOSITION_LABEL: Record<CodemodDisposition, string> = {
  SAFE_AUTO: "SAFE AUTO MIGRATION",
  REVIEW_REQUIRED: "REVIEW REQUIRED",
  BLOCKED: "BLOCKED",
};

function loadAllowlist(): string[] {
  const configPath = path.join(ROOT, "lib/form-ux-migration/map-codemod-allowlist.json");
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as AllowlistConfig;
  return raw.files;
}

function buildSuggestion(field: MigrationInventoryField): CodemodSuggestion | null {
  if (field.staticallyMigrated) return null;
  if (!/<input\b/.test(field.snippet)) return null;
  if (field.formId == null) return null;

  const profile = classifyMigrationField(field);
  const ssot = INPUT_KIND_SSOT[field.kind];
  const component =
    field.kind === "number"
      ? "MigratedNumberInput"
      : field.kind === "text"
        ? "MigratedTextInput"
        : ssot.component;

  return {
    file: field.file,
    line: field.line,
    fieldId: field.fieldId,
    formId: field.formId,
    disposition: profile.codemodDisposition,
    dispositionLabel: DISPOSITION_LABEL[profile.codemodDisposition],
    tier: profile.tier,
    tierLabel: profile.tierLabel,
    signals: profile.signals,
    original: field.snippet,
    suggestion: `<${component} formId="${field.formId}" fieldId="${field.fieldId}" ... />`,
  };
}

const allowlist = new Set(loadAllowlist());
const { fields } = scanMigrationInventory();
const allSuggestions = fields
  .filter((f) => allowlist.has(f.file))
  .map(buildSuggestion)
  .filter((s): s is CodemodSuggestion => s != null);

if (JSON_OUT) {
  console.log(JSON.stringify(allSuggestions, null, 2));
} else {
  console.log(`Form UX Migration Codemod (${WRITE ? "WRITE" : "dry-run"})`);
  console.log("------------------------------------------------");

  for (const s of allSuggestions) {
    console.log(`\n[${s.dispositionLabel}]`);
    console.log(`${s.file}:${s.line}`);
    console.log(`  ${s.formId} / ${s.fieldId} / tier ${s.tier} (${s.tierLabel})`);
    if (s.signals.length > 0) {
      console.log(`  signals: ${s.signals.join(", ")}`);
    }
    console.log(`  - ${s.original}`);
    console.log(`  + ${s.suggestion}`);
  }

  if (allSuggestions.length === 0) {
    console.log("\nNo eligible raw inputs in allowlist.");
  }

  if (WRITE && allSuggestions.length > 0) {
    console.log("\n--write: manual review required; auto-rewrite not enabled for safety.");
    console.log("Apply migrated components manually using suggestions above.");
  }
}
