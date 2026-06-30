import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";
import type {
  ImportDuplicateAction,
  ImportDuplicateRules,
  ImportEntity,
  ImportExecuteResult,
  ImportFieldDef,
  ImportMappingConfig,
  ImportPreviewRowBase,
} from "@/lib/data-import/core/types";

export type ImportStrategy = "initial" | "incremental" | "sync" | "merge" | "replace";

export type ImportRowAction = "skip" | "update" | "replace" | "create";

export type ImportPermissionConfig =
  | { kind: "module"; module: string; overwriteRequiresAdmin?: boolean }
  | { kind: "manageSettings" };

export type ImportPluginMeta = {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  status: "active" | "stub";
  fields: ImportFieldDef[];
  supportedStrategies: ImportStrategy[];
  defaultStrategy: ImportStrategy;
  duplicateRules: ImportDuplicateRules;
  allowedDuplicateActions: ImportDuplicateAction[];
  allowedRowActions: ImportRowAction[];
  rowLabelKeys: string[];
  templateFilename: string;
  templateSheetName?: string;
  permission: ImportPermissionConfig;
  relatedEntities?: ImportEntity[];
  uiEntry?: { section: string; placement: "toolbar" | "settings" };
  exportEnabled?: boolean;
};

export type ImportParseOutput = {
  sheets: Array<{ index: number; name: string; rowCount: number; columnCount: number }>;
  matrix: unknown[][];
  warnings: string[];
  fileName: string;
  suggestedMapping: ImportMappingConfig;
  fields: ImportFieldDef[];
};

export type ImportPreviewOutput = {
  batchId: string;
  fileName: string;
  fields: ImportFieldDef[];
  rows: Array<ImportPreviewRowBase & Record<string, unknown>>;
  stats: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    duplicates: number;
    truncated: boolean;
  };
  warnings: string[];
  suggestedStrategy?: ImportStrategy;
};

export type ImportExecuteInput = {
  batchId: string;
  userId: string;
  fileName: string;
  mapping: ImportMappingConfig;
  strategy?: ImportStrategy;
  rules?: Record<string, unknown>;
  decisions: unknown[];
};

export interface ImportEntityPlugin extends ImportPluginMeta {
  patterns: FieldPatternSet;
  parseFile(input: { fileName: string; fileBase64: string; sheetIndex?: number }): Promise<ImportParseOutput>;
  buildPreview(input: {
    userId: string;
    fileName: string;
    fileBase64: string;
    fileSha256?: string;
    mapping: ImportMappingConfig;
    duplicateDefaultAction?: ImportDuplicateAction;
    strategy?: ImportStrategy;
  }): Promise<ImportPreviewOutput>;
  execute(input: ImportExecuteInput): Promise<ImportExecuteResult>;
  buildDecisionsFromPreview(
    preview: ImportPreviewOutput,
    rowActions: Record<number, ImportRowAction>,
  ): unknown[];
  generateTemplate(): Buffer;
}
