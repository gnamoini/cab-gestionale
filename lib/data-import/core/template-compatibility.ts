import { createHash } from "node:crypto";
import type { ImportExportFieldDef, ExportMode } from "@/lib/data-import/core/field-schema";
import type { ImportEntity } from "@/lib/data-import/core/types";

export type TemplateMetadata = {
  templateVersion: string;
  pluginVersion: string;
  entity: ImportEntity;
  schemaHash: string;
  exportMode: ExportMode;
  generatedAt: string;
  manifestHash?: string;
};

export type CompatibilityIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type CompatibilityResult = {
  ok: boolean;
  blockers: CompatibilityIssue[];
  warnings: CompatibilityIssue[];
};

export function parseTemplateVersion(version: string): { major: number; minor: number } | null {
  const m = /^(\d+)\.(\d+)$/.exec(version.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}

export function computeSchemaHash(fields: ImportExportFieldDef[], mode: ExportMode = "importable"): string {
  const canonical = fields
    .filter((f) => {
      if (mode === "template") return true;
      if (mode === "backup") return f.exportIncluded?.backup !== false;
      return f.exportIncluded?.importable !== false;
    })
    .map((f) => `${f.key}:${f.dataType ?? "string"}:${f.importWritable !== false}:${f.required ? 1 : 0}`)
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export function buildTemplateMetadata(input: {
  entity: ImportEntity;
  pluginVersion: string;
  templateVersion: string;
  fields: ImportExportFieldDef[];
  exportMode: ExportMode;
}): TemplateMetadata {
  return {
    templateVersion: input.templateVersion,
    pluginVersion: input.pluginVersion,
    entity: input.entity,
    schemaHash: computeSchemaHash(input.fields, input.exportMode),
    exportMode: input.exportMode,
    generatedAt: new Date().toISOString(),
  };
}

export function assessImportCompatibility(input: {
  fileMeta: Partial<TemplateMetadata>;
  pluginTemplateVersion: string;
  pluginMinVersion?: string;
  pluginEntity: ImportEntity;
  requiredFieldKeys: string[];
  detectedColumnKeys: string[];
  fileSchemaHash?: string;
  currentSchemaHash: string;
}): CompatibilityResult {
  const blockers: CompatibilityIssue[] = [];
  const warnings: CompatibilityIssue[] = [];

  if (input.fileMeta.entity && input.fileMeta.entity !== input.pluginEntity) {
    blockers.push({
      code: "ENTITY_MISMATCH",
      message: `File per entità ${input.fileMeta.entity}, atteso ${input.pluginEntity}.`,
      severity: "error",
    });
  }

  const fileTv = input.fileMeta.templateVersion
    ? parseTemplateVersion(input.fileMeta.templateVersion)
    : null;
  const pluginTv = parseTemplateVersion(input.pluginTemplateVersion);
  if (fileTv && pluginTv && fileTv.major < pluginTv.major) {
    blockers.push({
      code: "TEMPLATE_MAJOR_INCOMPATIBLE",
      message: `Template v${input.fileMeta.templateVersion} non compatibile (richiesto major ≥ ${pluginTv.major}).`,
      severity: "error",
    });
  } else if (fileTv && pluginTv && fileTv.minor < pluginTv.minor) {
    warnings.push({
      code: "TEMPLATE_MINOR_OLD",
      message: `Template v${input.fileMeta.templateVersion} precedente alla v${input.pluginTemplateVersion}.`,
      severity: "warning",
    });
  }

  for (const key of input.requiredFieldKeys) {
    if (!input.detectedColumnKeys.includes(key)) {
      blockers.push({
        code: "REQUIRED_COLUMN_MISSING",
        message: `Colonna obbligatoria mancante: ${key}.`,
        severity: "error",
      });
    }
  }

  if (input.fileSchemaHash && input.fileSchemaHash !== input.currentSchemaHash) {
    warnings.push({
      code: "SCHEMA_HASH_DIFF",
      message: "SchemaHash diverso (colonne opzionali o ordine modificato). Import consentito se versione compatibile.",
      severity: "warning",
    });
  }

  const unknown = input.detectedColumnKeys.filter(
    (k) => !input.requiredFieldKeys.includes(k) && k !== "importa" && k !== "Importa",
  );
  if (unknown.length > 5) {
    warnings.push({
      code: "EXTRA_COLUMNS",
      message: `${unknown.length} colonne extra verranno ignorate.`,
      severity: "warning",
    });
  }

  return { ok: blockers.length === 0, blockers, warnings };
}
