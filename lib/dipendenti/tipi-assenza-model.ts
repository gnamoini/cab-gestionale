export type TipoAssenzaConfig = {
  id: string;
  label: string;
  abbrev: string;
  requiresCustomText?: boolean;
  sortOrder: number;
};

const DEFAULT_TIPI: Omit<TipoAssenzaConfig, "id">[] = [
  { label: "Ferie", abbrev: "F", sortOrder: 0 },
  { label: "Malattia", abbrev: "M", sortOrder: 1 },
  { label: "Permesso", abbrev: "P", sortOrder: 2 },
  { label: "Infortunio", abbrev: "I", sortOrder: 3 },
  { label: "Maternità", abbrev: "MAT", sortOrder: 4 },
  { label: "Congedo", abbrev: "C", sortOrder: 5 },
  { label: "Altro", abbrev: "A", requiresCustomText: true, sortOrder: 6 },
];

/** Tipo «Altro» — unico con motivo scritto a mano configurabile in impostazioni. */
export function isAltroTipoAssenzaLabel(label: string): boolean {
  return label.trim().toLowerCase() === "altro";
}

export function createTipoAssenzaId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tipo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultTipiAssenza(): TipoAssenzaConfig[] {
  return DEFAULT_TIPI.map((t, i) => ({
    ...t,
    id: `default-tipo-${i}`,
  }));
}

export function parseTipiAssenzaFromPayload(raw: unknown): TipoAssenzaConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultTipiAssenza();
  const out: TipoAssenzaConfig[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : createTipoAssenzaId();
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const abbrev = typeof o.abbrev === "string" ? o.abbrev.trim() : "";
    if (!label || !abbrev) continue;
    out.push({
      id,
      label,
      abbrev: abbrev.slice(0, 6),
      requiresCustomText: isAltroTipoAssenzaLabel(label) ? true : Boolean(o.requiresCustomText),
      sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : out.length,
    });
  }
  return out.length ? out.sort((a, b) => a.sortOrder - b.sortOrder) : defaultTipiAssenza();
}

export function resolveTipoById(
  tipi: readonly TipoAssenzaConfig[],
  id: string | null | undefined,
): TipoAssenzaConfig | undefined {
  const t = id?.trim();
  if (!t) return undefined;
  return tipi.find((x) => x.id === t);
}

export function resolveTipoAbbrev(label: string, tipi: readonly TipoAssenzaConfig[]): string {
  const match = tipi.find((t) => t.label.toLowerCase() === label.trim().toLowerCase());
  if (match) return match.abbrev;
  return label.trim().slice(0, 3).toUpperCase() || "A";
}
