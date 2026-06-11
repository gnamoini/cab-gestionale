import fs from "node:fs";
import path from "node:path";
import { getFormUxRegistryEntry } from "@/lib/form-ux-migration/form-ux-registry";
import {
  defaultKindForInferredInput,
  inferFormIdFromPath,
} from "@/lib/form-ux-migration/registry";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import type {
  FormUxDomain,
  FormUxFormId,
  FormUxInputKind,
  FormUxMigrationMode,
} from "@/lib/form-ux-migration/types";

export type MigrationFieldStatus = "legacy" | "ssot" | "shadow" | "hybrid";

export type MigrationInventoryField = {
  fieldKey: string;
  formId: FormUxFormId | null;
  fieldId: string;
  file: string;
  line: number;
  kind: FormUxInputKind;
  snippet: string;
  status: MigrationFieldStatus;
  rolloutMode?: FormUxMigrationMode;
  enforcement?: string;
  domain?: FormUxDomain;
  staticallyMigrated: boolean;
  source: "scan" | "rollout";
};

export type MigrationInventoryReport = {
  scannedFiles: number;
  fields: MigrationInventoryField[];
  rolloutFields: {
    formId: string;
    fieldId: string;
    mode?: FormUxMigrationMode;
    kind?: FormUxInputKind;
  }[];
};

const DEFAULT_COMPONENTS_DIR = "components";

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

function inferFieldIdFromIdAttr(snippet: string, line: number): string {
  const m = snippet.match(/id=["']([^"']+)["']/);
  if (!m) return `field-${line}`;
  return m[1]
    .replace(/^magazzino-ricambio-/, "")
    .replace(/_/g, "-");
}

function resolveDomain(formId: FormUxFormId | null): FormUxDomain | undefined {
  if (formId == null) return undefined;
  return getFormUxRegistryEntry(formId)?.domain;
}

function rolloutEntry(formId: FormUxFormId | null, fieldId: string) {
  if (formId == null) return undefined;
  return FORM_UX_ROLLOUT[formId]?.fields[fieldId];
}

function statusFromRollout(
  mode: FormUxMigrationMode | undefined,
  enforcement: string | undefined,
  staticallyMigrated: boolean,
  hasRolloutEntry: boolean,
): MigrationFieldStatus {
  if (mode === "ssot" || mode === "hybrid") return mode;
  if (mode === "shadow") return "shadow";
  if (enforcement != null && enforcement !== "off") return "shadow";
  if (hasRolloutEntry && staticallyMigrated) return "ssot";
  return "legacy";
}

function makeFieldKey(
  formId: FormUxFormId | null,
  fieldId: string,
  file: string,
  line: number,
): string {
  if (formId != null) return `${formId}.${fieldId}`;
  return `${file}:${line}`;
}

function scanFile(absPath: string, root: string): MigrationInventoryField[] {
  const rel = path.relative(root, absPath).replace(/\\/g, "/");
  const src = fs.readFileSync(absPath, "utf8");
  const formId = inferFormIdFromPath(rel);
  const rows: MigrationInventoryField[] = [];
  const lines = src.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isMigratedComponent =
      /MigratedNumberInput|MigratedTextInput/.test(line);
    const isRawInput = /<input\b|<textarea\b|<select\b/.test(line);

    if (!isMigratedComponent && !isRawInput) continue;
    if (isRawInput && /MigratedNumberInput|MigratedTextInput/.test(line)) continue;

    const window = lines.slice(i, Math.min(i + 12, lines.length)).join("\n");
    const kind = isMigratedComponent
      ? line.includes("MigratedTextInput")
        ? "text"
        : "number"
      : defaultKindForInferredInput(window);

    const fieldId =
      extractProp(window, "fieldId") ?? inferFieldIdFromIdAttr(window, i + 1);
    const resolvedFormId =
      (extractProp(window, "formId") as FormUxFormId | null) ?? formId;

    const staticallyMigrated =
      isMigratedComponent ||
      /GestionaleNumberInput|GestionaleTextarea|GlobalSelect/.test(window);

    const rollout = rolloutEntry(resolvedFormId, fieldId);
    const hasRolloutEntry = rollout != null;
    const status = statusFromRollout(
      rollout?.mode,
      rollout?.enforcement,
      staticallyMigrated,
      hasRolloutEntry,
    );

    rows.push({
      fieldKey: makeFieldKey(resolvedFormId, fieldId, rel, i + 1),
      formId: resolvedFormId,
      fieldId,
      file: rel,
      line: i + 1,
      kind: rollout?.kind ?? kind,
      snippet: line.trim().slice(0, 120),
      status,
      rolloutMode: rollout?.mode,
      enforcement: rollout?.enforcement,
      domain: resolveDomain(resolvedFormId),
      staticallyMigrated,
      source: "scan",
    });
  }

  return rows;
}

function mergeRolloutOnlyFields(
  scanned: MigrationInventoryField[],
): MigrationInventoryField[] {
  const byKey = new Map(scanned.map((f) => [f.fieldKey, f]));
  const merged = [...scanned];

  for (const [formId, rollout] of Object.entries(FORM_UX_ROLLOUT) as [
    FormUxFormId,
    (typeof FORM_UX_ROLLOUT)[FormUxFormId],
  ][]) {
    for (const [fieldId, field] of Object.entries(rollout.fields)) {
      if (!field) continue;
      const fieldKey = `${formId}.${fieldId}`;
      if (byKey.has(fieldKey)) continue;

      merged.push({
        fieldKey,
        formId,
        fieldId,
        file: "rollout-config.ts",
        line: 0,
        kind: field.kind,
        snippet: `${formId}.${fieldId}`,
        status: statusFromRollout(field.mode, field.enforcement, false, true),
        rolloutMode: field.mode,
        enforcement: field.enforcement,
        domain: resolveDomain(formId),
        staticallyMigrated: field.mode === "ssot" || field.mode === "hybrid",
        source: "rollout",
      });
    }
  }

  return merged;
}

export function scanMigrationInventory(options?: {
  root?: string;
  componentsDir?: string;
}): MigrationInventoryReport {
  const root = options?.root ?? process.cwd();
  const componentsDir = path.join(root, options?.componentsDir ?? DEFAULT_COMPONENTS_DIR);

  const files: string[] = [];
  walkTsx(componentsDir, files);

  const scanned = files.flatMap((f) => scanFile(f, root));
  const fields = mergeRolloutOnlyFields(scanned);

  const rolloutFields = Object.entries(FORM_UX_ROLLOUT).flatMap(([formId, rollout]) =>
    Object.entries(rollout.fields).map(([fieldId, field]) => ({
      formId,
      fieldId,
      mode: field?.mode,
      kind: field?.kind,
    })),
  );

  return {
    scannedFiles: files.length,
    fields,
    rolloutFields,
  };
}

export function summarizeInventoryCoverage(fields: MigrationInventoryField[]): {
  total: number;
  legacy: number;
  shadow: number;
  ssot: number;
  hybrid: number;
  coveragePct: number;
} {
  const legacy = fields.filter((f) => f.status === "legacy").length;
  const shadow = fields.filter((f) => f.status === "shadow").length;
  const ssot = fields.filter((f) => f.status === "ssot").length;
  const hybrid = fields.filter((f) => f.status === "hybrid").length;
  const migrated = ssot + hybrid + shadow;
  const total = fields.length;

  return {
    total,
    legacy,
    shadow,
    ssot,
    hybrid,
    coveragePct: total > 0 ? Math.round((migrated / total) * 100) : 100,
  };
}
