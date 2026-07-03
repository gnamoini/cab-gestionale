/** FilterContract — domain filter schema SSOT (paginated list). */
export type LavorazioniWhereSpec = Readonly<{
  mode: "active" | "closed" | "all";
  search: string | null;
  stato: string | null;
  cursorCreatedAt: string | null;
  cursorId: string | null;
  limit: number;
}>;

export type NormalizedLavorazioniFilters = LavorazioniWhereSpec;
