export type MezzoAnagraficaMeta = {
  cantiere?: string;
  tipoTelaio?: string;
  marcaTelaio?: string;
  modelloTelaio?: string;
  oreLavoro?: number;
  km?: number;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseMezzoMeta(raw: unknown): MezzoAnagraficaMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const m = raw as Record<string, unknown>;
  const oreLavoro = num(m.oreLavoro);
  const km = num(m.km);
  return {
    cantiere: str(m.cantiere) || undefined,
    tipoTelaio: str(m.tipoTelaio) || undefined,
    marcaTelaio: str(m.marcaTelaio) || undefined,
    modelloTelaio: str(m.modelloTelaio) || undefined,
    oreLavoro: oreLavoro != null && oreLavoro >= 0 ? oreLavoro : undefined,
    km: km != null && km >= 0 ? km : undefined,
  };
}

export function mezzoFormToMeta(f: {
  cantiere: string;
  tipoTelaio: string;
  marcaTelaio: string;
  modelloTelaio: string;
  oreLavoro: string;
  km: string;
}): MezzoAnagraficaMeta {
  const ore = num(f.oreLavoro.trim());
  const kmN = num(f.km.trim());
  return {
    cantiere: f.cantiere.trim() || undefined,
    tipoTelaio: f.tipoTelaio.trim() || undefined,
    marcaTelaio: f.marcaTelaio.trim() || undefined,
    modelloTelaio: f.modelloTelaio.trim() || undefined,
    oreLavoro: ore != null && ore >= 0 ? ore : undefined,
    km: kmN != null && kmN >= 0 ? kmN : undefined,
  };
}

export function metaToMezzoFormFields(meta: MezzoAnagraficaMeta): {
  cantiere: string;
  tipoTelaio: string;
  marcaTelaio: string;
  modelloTelaio: string;
  oreLavoro: string;
  km: string;
} {
  return {
    cantiere: meta.cantiere ?? "",
    tipoTelaio: meta.tipoTelaio ?? "",
    marcaTelaio: meta.marcaTelaio ?? "",
    modelloTelaio: meta.modelloTelaio ?? "",
    oreLavoro: meta.oreLavoro != null ? String(meta.oreLavoro) : "",
    km: meta.km != null ? String(meta.km) : "",
  };
}
