import fs from "node:fs";
import path from "node:path";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

export type TierPatternStat = {
  pattern: string;
  frequency: number;
  safeBias: "safe" | "unsafe" | "mixed";
  exampleFieldKeys: string[];
};

type PatternRule = {
  pattern: string;
  regex: RegExp;
  safeBias: "safe" | "unsafe" | "mixed";
};

const PATTERN_RULES: PatternRule[] = [
  { pattern: "MigratedNumberInput", regex: /MigratedNumberInput/, safeBias: "safe" },
  { pattern: "MigratedTextInput", regex: /MigratedTextInput/, safeBias: "safe" },
  { pattern: "GestionaleNumberInput", regex: /GestionaleNumberInput/, safeBias: "safe" },
  { pattern: "GestionaleTextarea", regex: /GestionaleTextarea/, safeBias: "safe" },
  { pattern: "GlobalSelect", regex: /GlobalSelect/, safeBias: "mixed" },
  { pattern: "HOC_wrapper", regex: /\bwith[A-Z]\w*\(/, safeBias: "mixed" },
  { pattern: "useFormField", regex: /\buseFormField\b/, safeBias: "mixed" },
  { pattern: "useController", regex: /\buseController\b/, safeBias: "mixed" },
  { pattern: "register_rhf", regex: /\bregister\s*\(/, safeBias: "mixed" },
  { pattern: "raw_input_thin_wrapper", regex: /<input[\s\S]{0,80}\/>/, safeBias: "safe" },
  { pattern: "onChange_controlled", regex: /\bonChange\b/, safeBias: "safe" },
  { pattern: "validation_ui_only", regex: /\b(required|pattern|min=|max=)\b/, safeBias: "safe" },
  { pattern: "helper_or_error_text", regex: /helper|error|aria-invalid/i, safeBias: "safe" },
];

function readFieldWindow(file: string, line: number, root: string, radius = 12): string {
  if (file === "rollout-config.ts" || line <= 0) return "";
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return "";
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const start = Math.max(0, line - radius);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start, end).join("\n");
}

export function detectFieldPatterns(
  field: MigrationInventoryField,
  options?: { root?: string },
): string[] {
  const root = options?.root ?? process.cwd();
  const window = `${field.snippet}\n${readFieldWindow(field.file, field.line, root)}`;
  const matched: string[] = [];
  for (const rule of PATTERN_RULES) {
    if (rule.regex.test(window)) matched.push(rule.pattern);
  }
  return matched;
}

export function mineTierPatterns(
  fields: MigrationInventoryField[],
  options?: { root?: string },
): TierPatternStat[] {
  const root = options?.root ?? process.cwd();
  const buckets = new Map<string, { keys: string[]; safeBias: "safe" | "unsafe" | "mixed" }>();

  for (const field of fields) {
    const patterns = detectFieldPatterns(field, { root });
    for (const pattern of patterns) {
      const rule = PATTERN_RULES.find((r) => r.pattern === pattern);
      const existing = buckets.get(pattern) ?? {
        keys: [],
        safeBias: rule?.safeBias ?? "mixed",
      };
      if (!existing.keys.includes(field.fieldKey)) {
        existing.keys.push(field.fieldKey);
      }
      buckets.set(pattern, existing);
    }
  }

  return [...buckets.entries()]
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.keys.length,
      safeBias: data.safeBias,
      exampleFieldKeys: data.keys.slice(0, 5),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}
