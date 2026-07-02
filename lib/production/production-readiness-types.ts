export type ProductionReadinessCategory =
  | "security"
  | "storage"
  | "feature-flag"
  | "rbac"
  | "code"
  | "database"
  | "ux"
  | "ops-env";

export type ProductionReadinessFinding = {
  id: string;
  category: ProductionReadinessCategory;
  message: string;
  detail?: string;
};

export type ProductionReadinessDbSnapshot = {
  connected: boolean;
  operatorGlobalSettingsDbEnabled: boolean;
  mezzoAttrezzatureV2DbEnabled: boolean;
  documentiBucketPublic: boolean | null;
  legacyPublicDocumentUrlCount: number;
  storageOrphanObjectCount: number | null;
  rbacOperatorPilotSqlPresent: boolean;
  portalSecurityGuardSqlPresent: boolean;
  userPermissionsRlsPresent: boolean;
};

export type ProductionReadinessCodeScan = {
  legacyResolveDocumentoFileUrlHits: { file: string; line: number }[];
  legacySupabasePublicUrlInCodeHits: { file: string; line: number }[];
  pilotEnvImportOutsideAllowlist: { file: string; line: number }[];
  rbacBypassOutsideCentralFunction: { file: string; line: number }[];
  directUseToastHits: { file: string; line: number }[];
  legacyDialogHits: { file: string; line: number }[];
  realtimePollingFallbackPresent: boolean;
  logBatcherPresent: boolean;
  isOperatorGlobalSettingsUsedInRbac: boolean;
  legacyMezziColumnWriteHits: { file: string; line: number }[];
  legacyAdapterImportOutsideAllowlist: { file: string; line: number }[];
  r4DropMigrationInAutoPath: boolean;
};

export type ProductionReadinessInput = {
  env?: NodeJS.ProcessEnv;
  codeScan?: ProductionReadinessCodeScan;
  db?: ProductionReadinessDbSnapshot;
  /** Se false, i check DB diventano warning invece di essere ignorati silenziosamente. */
  requireDb?: boolean;
};

export type ProductionReadinessResult = {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  findings: {
    blockers: ProductionReadinessFinding[];
    warnings: ProductionReadinessFinding[];
  };
  checkedAt: string;
  meta: {
    dbChecked: boolean;
    codeScanned: boolean;
    productionTarget: boolean;
  };
};
