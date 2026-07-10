import type { ImportRowIssue } from "@/lib/data-import/core/types";

export type FieldGroup = "identity" | "business" | "meta" | "audit" | "concurrency";

export type FieldDataType = "string" | "number" | "date" | "boolean" | "json" | "enum" | "uuid";

export type ExportMode = "template" | "importable" | "backup";

export type ImportExportFieldDef = {
  key: string;
  label: string;
  group?: FieldGroup;
  dataType?: FieldDataType;
  required?: boolean;
  importWritable?: boolean;
  exportIncluded?: { backup: boolean; importable: boolean };
  computed?: boolean;
  enumValues?: string[];
  maxLength?: number;
  pattern?: string;
  lookupRef?: { sheet: string; column: string };
  relational?: { parentSheet: string; fkField: string };
  description?: string;
  example?: string;
  mergePolicyOverride?: "PATCH" | "REPLACE" | "SMART";
};

export const PROTECTED_FIELD_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "deleted_at",
  "entity_key",
  "version",
]);

export function isFieldImportWritable(field: ImportExportFieldDef): boolean {
  if (PROTECTED_FIELD_KEYS.has(field.key)) return false;
  if (field.computed) return false;
  return field.importWritable !== false;
}

export function isFieldExportIncluded(field: ImportExportFieldDef, mode: ExportMode): boolean {
  if (mode === "template") return true;
  if (field.exportIncluded) {
    return mode === "backup" ? field.exportIncluded.backup : field.exportIncluded.importable;
  }
  if (mode === "backup") return true;
  return isFieldImportWritable(field) || field.group === "concurrency";
}

export function legacyFieldToExportField(field: {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
  example?: string;
}): ImportExportFieldDef {
  return {
    key: field.key,
    label: field.label,
    required: field.required,
    description: field.description,
    example: field.example,
    dataType: "string",
    importWritable: !PROTECTED_FIELD_KEYS.has(field.key),
    exportIncluded: { backup: true, importable: !PROTECTED_FIELD_KEYS.has(field.key) },
  };
}

export type ValidationIssue = ImportRowIssue;
