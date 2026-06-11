/**
 * Prepare SSOT enforcement rollout — scan Migrated*Input and suggest config upgrades.
 * Usage: npx tsx scripts/form-ux-prepare-ssot-enforcement.ts [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import type { FormUxFormId } from "@/lib/form-ux-migration/types";

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, "components");
const JSON_OUT = process.argv.includes("--json");

type MigratedFieldUsage = {
  file: string;
  line: number;
  formId: string | null;
  fieldId: string | null;
  component: "MigratedNumberInput" | "MigratedTextInput";
};

type Suggestion = {
  formId: string;
  fieldId: string;
  file: string;
  currentMode: string;
  currentEnforcement: string;
  suggestedEnforcement: "warn";
  missingStateKey: boolean;
  configSnippet: string;
};

function walkTsx(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsx(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(full);
  }
}

function extractProp(block: string, prop: string): string | null {
  const m = block.match(new RegExp(`${prop}=["']([^"']+)["']`));
  return m?.[1] ?? null;
}

function scanFile(absPath: string): MigratedFieldUsage[] {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  const src = fs.readFileSync(absPath, "utf8");
  const lines = src.split("\n");
  const usages: MigratedFieldUsage[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const component = line.includes("MigratedNumberInput")
      ? "MigratedNumberInput"
      : line.includes("MigratedTextInput")
        ? "MigratedTextInput"
        : null;
    if (!component) continue;

    const block = lines.slice(i, Math.min(i + 12, lines.length)).join("\n");
    usages.push({
      file: rel,
      line: i + 1,
      formId: extractProp(block, "formId"),
      fieldId: extractProp(block, "fieldId"),
      component,
    });
  }

  return usages;
}

const files: string[] = [];
walkTsx(COMPONENTS_DIR, files);
const usages = files.flatMap(scanFile);

const suggestions: Suggestion[] = [];

for (const usage of usages) {
  if (!usage.formId || !usage.fieldId) continue;
  const formId = usage.formId as FormUxFormId;
  const rollout = FORM_UX_ROLLOUT[formId]?.fields[usage.fieldId];
  if (!rollout) continue;

  const enforcement = rollout.enforcement ?? "off";
  const mode = rollout.mode;

  if (mode === "shadow" && (enforcement === "off" || !rollout.enforcement)) {
    suggestions.push({
      formId: usage.formId,
      fieldId: usage.fieldId,
      file: usage.file,
      currentMode: mode,
      currentEnforcement: enforcement,
      suggestedEnforcement: "warn",
      missingStateKey: !rollout.stateKey,
      configSnippet: `"${usage.fieldId}": { kind: "${rollout.kind}", mode: "shadow", enforcement: "warn", stateKey: "..." }`,
    });
  }
}

const report = {
  migratedFields: usages.length,
  suggestions: suggestions.length,
  missingStateKey: suggestions.filter((s) => s.missingStateKey).length,
  items: suggestions,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Form UX — Prepare SSOT Enforcement");
  console.log("----------------------------------");
  console.log(`Migrated fields found: ${report.migratedFields}`);
  console.log(`Upgrade suggestions: ${report.suggestions}`);
  if (suggestions.length > 0) {
    console.log("\nSuggestions:");
    for (const s of suggestions) {
      console.log(`  ${s.formId}.${s.fieldId} (${s.file})`);
      console.log(`    current: mode=${s.currentMode} enforcement=${s.currentEnforcement}`);
      console.log(`    suggest: enforcement="${s.suggestedEnforcement}"`);
      if (s.missingStateKey) console.log("    WARN: missing stateKey for submit reconciliation");
      console.log(`    config: ${s.configSnippet}`);
    }
  } else {
    console.log("\nNo shadow fields pending enforcement upgrade.");
  }
}
