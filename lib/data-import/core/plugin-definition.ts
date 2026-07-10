import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ImportExportFieldDef, ExportMode } from "@/lib/data-import/core/field-schema";
import type { DataSourceKind } from "@/lib/data-import/core/data-source";
import type { ExportSinkKind } from "@/lib/data-import/core/export-sink";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ImportPermissionConfig } from "@/lib/data-import/core/import-plugin";
import type { MergePolicy } from "@/lib/data-import/core/merge-policy";

export type SnapshotStrategy = "single_query" | "transactional" | "materialized";

export type RecoveryCapability = "NONE" | "CREATE_ONLY" | "FULL";

export type ExportScope = Record<string, unknown>;

export type SnapshotProviderContext = {
  userId: string;
  scope?: ExportScope;
  mode: ExportMode;
};

export interface SnapshotProvider {
  strategy: SnapshotStrategy;
  fetch(ctx: SnapshotProviderContext): Promise<NormalizedDataset>;
}

export interface LookupProvider {
  buildLookupSheets(ctx: SnapshotProviderContext): Promise<Record<string, string[][]>>;
}

export interface ConflictProvider {
  concurrencyField: string;
  check(
    row: Record<string, unknown>,
    current: Record<string, unknown> | null,
  ): { conflict: boolean; message?: string };
}

export interface RecoveryProvider {
  capability: RecoveryCapability;
  buildUndoCommands?(
    batchId: string,
    createdIds: string[],
  ): Promise<unknown[]>;
}

export type MergePolicyConfig = {
  default: MergePolicy;
  emptyStringClears?: boolean;
};

export type PluginHookContext = {
  entity: ImportEntity;
  userId: string;
  batchId?: string;
  correlationId?: string;
};

export type PluginHooks = {
  beforeParse?(ctx: PluginHookContext): Promise<void>;
  afterParse?(ctx: PluginHookContext, dataset: NormalizedDataset): Promise<void>;
  beforeValidate?(ctx: PluginHookContext, dataset: NormalizedDataset): Promise<void>;
  afterValidate?(ctx: PluginHookContext, preview: unknown): Promise<void>;
  beforeExecute?(ctx: PluginHookContext, decisions: unknown): Promise<void>;
  afterExecute?(ctx: PluginHookContext, result: unknown): Promise<void>;
  beforeExport?(ctx: PluginHookContext, scope: ExportScope): Promise<void>;
  afterExport?(ctx: PluginHookContext, buffer: Buffer): Promise<void>;
};

export type RelationalSheetDef = {
  parentSheet: string;
  childSheet: string;
  fkField: string;
  maxDepth: 2;
};

export type ImportExportPluginDefinition = {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  status: "active" | "stub";
  pageKey?: string;
  pluginVersion: string;
  templateVersion: string;
  minPluginVersion?: string;
  fields: ImportExportFieldDef[];
  permission: ImportPermissionConfig;
  templateFilename: string;
  templateSheetName?: string;
  dataSources: DataSourceKind[];
  exportSinks: ExportSinkKind[];
  matchKeys?: Array<{ field: string; priority: number }>;
  relationalSheets?: RelationalSheetDef[];
  snapshotProvider?: SnapshotProvider;
  lookupProvider?: LookupProvider;
  conflictProvider?: ConflictProvider;
  recoveryProvider?: RecoveryProvider;
  mergePolicy?: MergePolicyConfig;
  hooks?: PluginHooks;
  uiEntry?: { section: string; placement: "toolbar" | "settings" };
};
