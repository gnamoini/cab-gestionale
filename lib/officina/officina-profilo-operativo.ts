/** Profilo operativo officina — settings `system.officina_profilo_operativo`. */

export type OfficinaProfiloOperativo = "attrezzature" | "telai" | "misto";

export const OFFICINA_PROFILO_MODULE = "system" as const;
export const OFFICINA_PROFILO_KEY = "officina_profilo_operativo" as const;

const VALID: OfficinaProfiloOperativo[] = ["attrezzature", "telai", "misto"];

export function parseOfficinaProfiloOperativo(value: unknown): OfficinaProfiloOperativo {
  if (typeof value === "string" && VALID.includes(value as OfficinaProfiloOperativo)) {
    return value as OfficinaProfiloOperativo;
  }
  return "attrezzature";
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readOfficinaProfiloFromRows(
  rows: AppSettingsRowLike[] | undefined,
): OfficinaProfiloOperativo {
  if (!rows?.length) return "attrezzature";
  const row = rows.find((r) => r.module === OFFICINA_PROFILO_MODULE && r.key === OFFICINA_PROFILO_KEY);
  return parseOfficinaProfiloOperativo(row?.value);
}

export function defaultTargetTypeForProfilo(profilo: OfficinaProfiloOperativo) {
  return profilo === "telai" ? ("telaio" as const) : ("attrezzatura" as const);
}

export type SchedaIngressoMezzoSectionKind = "attrezzatura" | "telaio";

export function showTelaioSections(_profilo: OfficinaProfiloOperativo): boolean {
  void _profilo;
  return true;
}

export function showAttrezzaturaSections(profilo: OfficinaProfiloOperativo): boolean {
  return profilo === "attrezzature" || profilo === "misto";
}

export function schedaIngressoMezzoSectionOrder(
  profilo: OfficinaProfiloOperativo,
): readonly SchedaIngressoMezzoSectionKind[] {
  switch (profilo) {
    case "telai":
      return ["telaio"];
    case "misto":
      return ["telaio", "attrezzatura"];
    default:
      return ["attrezzatura", "telaio"];
  }
}

export function showInterventoTargetToggle(profilo: OfficinaProfiloOperativo): boolean {
  return profilo === "misto";
}
