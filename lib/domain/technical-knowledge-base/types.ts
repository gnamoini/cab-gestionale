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
};

export type TkbDraftBundle = {
  componenti: TkbComponente[];
  sintomi: TkbSintomo[];
  categorie: TkbCategoria[];
  procedure: TkbProcedure[];
  interventi: TkbIntervento[];
  ricambiMap: TkbRicambioMapEntry[];
};

export type TkbMatchInput = {
  lavorazioniText: string;
  anomaliaText?: string;
  noteIntervento?: string;
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
