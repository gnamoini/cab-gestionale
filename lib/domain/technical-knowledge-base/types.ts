/** SSOT tipi Technical Knowledge Base — dominio riusabile fuori preventivi. */

export type TkbPublishStatus = "draft" | "review" | "published" | "deprecated";

export type CatalogActivityType =
  | "smontaggio"
  | "sostituzione"
  | "pulizia"
  | "controllo"
  | "collaudo"
  | "diagnosi"
  | "ripristino";

export type CatalogActivity = {
  activityId: string;
  text: string;
  sort: number;
  required: boolean;
  includeInStandard?: boolean;
  activityType: CatalogActivityType;
  componenteSlugs?: string[];
};

export type InterventoActivityOverride = {
  activityId: string;
  action: "disable" | "replace";
  replacement?: CatalogActivity;
  reason?: string;
};

export type TkbComponente = {
  slug: string;
  label: string;
  categoriaSlug?: string;
  synonyms?: string[];
};

export type TkbSintomo = {
  slug: string;
  label: string;
  keywords: string[];
  relatedComponentiSlugs?: string[];
};

export type TkbCategoria = {
  slug: string;
  label: string;
  sortOrder?: number;
};

export type TkbCompatibilita = {
  targetTypes?: ("telaio" | "attrezzatura")[];
  tipiAttrezzatura?: string[];
  marche?: string[];
};

export type TkbProcedure = {
  slug: string;
  label: string;
  categoriaSlug?: string;
  attivita: CatalogActivity[];
  controlliFinali?: CatalogActivity[];
  publishStatus?: TkbPublishStatus;
};

export type TkbIntervento = {
  slug: string;
  label: string;
  categoriaSlug?: string;
  keywords: string[];
  componentiSlugs?: string[];
  sintomiSlugs?: string[];
  compatibilita?: TkbCompatibilita;
  procedureSlugs?: string[];
  activityOverrides?: InterventoActivityOverride[];
  attivitaPrincipali: CatalogActivity[];
  attivitaComplementari?: CatalogActivity[];
  controlliFinali?: CatalogActivity[];
  publishStatus?: TkbPublishStatus;
};

export type RicambioMatchQuality = "certain" | "partial" | "needs_review";

export type TkbRicambioMapEntry = {
  id: string;
  ricambioId: string;
  componenteSlug: string;
  azionePrevista: "sostituzione" | "installazione" | "revisione";
  activityId: string;
  matchConfidence: number;
  matchQuality: RicambioMatchQuality;
  lineTemplate?: string;
  requiredInDescription?: boolean;
  active: boolean;
  validFrom: string;
  validTo?: string | null;
};

export type TkbPublishedSnapshot = {
  schemaVersion: 1;
  kbVersion: number;
  publishedAt: string;
  componenti: TkbComponente[];
  sintomi: TkbSintomo[];
  categorie: TkbCategoria[];
  procedure: TkbProcedure[];
  interventi: TkbIntervento[];
  ricambiMap: TkbRicambioMapEntry[];
  /** Indici di ricerca pre-calcolati (opzionale, contract v1 estensione). */
  searchIndex?: TkbSearchIndex;
};

export type TkbSearchIndex = {
  keywordToInterventi: Record<string, string[]>;
  componentToInterventi: Record<string, string[]>;
  synonymToComponentSlug: Record<string, string>;
  activityById: Record<string, { interventoSlug: string; activity: CatalogActivity }>;
};

export type TkbDraftBundle = {
  componenti: TkbComponente[];
  sintomi: TkbSintomo[];
  categorie: TkbCategoria[];
  procedure: TkbProcedure[];
  interventi: TkbIntervento[];
  ricambiMap: TkbRicambioMapEntry[];
  buildReport?: TkbBuildReport;
  searchIndex?: TkbSearchIndex;
};

export type TkbEntityKind =
  | "categoria"
  | "componente"
  | "sintomo"
  | "procedure"
  | "intervento"
  | "ricambioMap";

export type TkbSourceFragment = {
  sourceId: string;
  precedence: number;
  entityKind: TkbEntityKind;
  entityKey: string;
  payload: unknown;
  relations?: { kind: string; targetKey: string }[];
  provenance: { origin: string; updatedAt?: string; recordId?: string };
};

export type TkbBuildMode = "full" | "incremental";

export type TkbChangeHint = {
  entityType: string;
  entityId: string;
  operation: "insert" | "update" | "delete";
};

export type TkbAdapterStats = {
  durationMs: number;
  fetched: number;
  included: number;
  excluded: number;
  fragments: number;
};

export type TkbBuildReport = {
  builtAt: string;
  durationMs: number;
  buildMode: TkbBuildMode;
  pipelineVersion: string;
  builderVersion: string;
  counts: {
    interventi: number;
    componenti: number;
    sintomi: number;
    categorie: number;
    procedure: number;
    ricambiMap: number;
    activities: number;
  };
  delta: { added: number; updated: number; removed: number };
  merge: { performed: number; duplicatesFound: number; conflictsResolved: number };
  excluded: { deleted: number; inactive: number; invalid: number; rbacDenied: number };
  warnings: string[];
  adapters: Record<string, TkbAdapterStats>;
};

export type TkbKbStats = {
  interventi: number;
  componenti: number;
  descrizioni: number;
  categorie: number;
  excludedDeleted: number;
  sourceCoverage: Record<string, { included: number; fetched: number }>;
  warnings: string[];
};

export type TkbMatchInput = {
  lavorazioniText: string;
  anomaliaText?: string;
  lavorazioneNote?: string;
  targetType?: "telaio" | "attrezzatura";
  tipoAttrezzatura?: string;
  marcaModello?: string;
};

export type TkbMatchResult = {
  interventoSlug: string;
  score: number;
  matchedBy: ("keyword" | "componente" | "sintomo" | "compatibilità")[];
  keywordMatch: number;
  componentMatch: number;
  symptomMatch: number;
  compatibility: number;
};

export type PublishTkbResult = {
  kbVersion: number;
  snapshotHash: string;
  draftHash: string;
  created: boolean;
  idempotent: boolean;
};

export type BenchmarkCase = {
  id: string;
  technicalBlob: string;
  anomaliaText?: string;
  approvedLines: string[];
  approvedActivityIds?: string[];
};

export type BenchmarkReport = {
  engine: "legacy" | "tde_v1";
  cases: number;
  kbCoverage: number;
  oar: number;
  zeroEditRate: number;
  unwantedLineRate: number;
  thr: number;
  tierDistribution: Record<string, number>;
  kbStats?: TkbKbStats;
};
