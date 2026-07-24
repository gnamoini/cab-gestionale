/** SSOT tipi motore ricerca gestionale — Toolbar v2 */

export type SearchFieldKind =
  | "code"
  | "plate"
  | "document"
  | "customer"
  | "description"
  | "note"
  | "brand"
  | "model"
  | "category"
  | "location"
  | "operator"
  | "generic";

export type SearchMatchType = "exact" | "prefix" | "contains" | "fts" | "similarity";

export type SearchFieldDef = {
  kind: SearchFieldKind;
  clientField: string;
  serverField?: string;
  searchable: boolean;
  indexed: boolean;
  fts: boolean;
  trgm: boolean;
  exact: boolean;
  weight?: number;
};

export type SearchExecutionMode = "client" | "server" | "both";

export type SearchDomainId =
  | "lavorazioni"
  | "preventivi"
  | "magazzino"
  | "mezzi"
  | "documenti"
  | "ordini-fornitori"
  | "fatturazione"
  | "security-users"
  | "client-portal-lavorazioni"
  | "settings";

export type FieldFilter = {
  field: string;
  value: string;
  raw: string;
};

export type ParsedSearchQuery = {
  raw: string;
  mode: "tokens" | "phrase";
  tokens: string[];
  phrase?: string;
  fieldFilters: FieldFilter[];
};

export type SearchDomainConfig<TRow = unknown, TCtx = unknown> = {
  domain: SearchDomainId;
  executionMode: SearchExecutionMode;
  fields: readonly SearchFieldDef[];
  buildDocument: (row: TRow, ctx?: TCtx) => string;
};

export type SearchMatchResult = {
  matches: boolean;
  score: number;
  matchType: SearchMatchType | null;
};
