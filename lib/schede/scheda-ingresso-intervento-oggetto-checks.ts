import type { InterventoTargetTypeScheda, SchedaIngressoFields } from "@/types/schede";

export type InterventoOggettoChecks = {
  suAttrezzatura: boolean;
  suTelaio: boolean;
};

type InterventoOggettoChecksSource = Pick<
  SchedaIngressoFields,
  "interventoSuAttrezzatura" | "interventoSuTelaio" | "targetType"
>;

/** Default: attrezzatura sì, telaio no — con fallback legacy su `targetType`. */
export function resolveInterventoOggettoChecks(
  source: InterventoOggettoChecksSource | null | undefined,
): InterventoOggettoChecks {
  if (
    source?.interventoSuAttrezzatura !== undefined ||
    source?.interventoSuTelaio !== undefined
  ) {
    const suAttrezzatura = source.interventoSuAttrezzatura ?? true;
    const suTelaio = source.interventoSuTelaio ?? false;
    if (!suAttrezzatura && !suTelaio) return { suAttrezzatura: true, suTelaio: false };
    return { suAttrezzatura, suTelaio };
  }
  if (source?.targetType === "telaio") return { suAttrezzatura: false, suTelaio: true };
  return { suAttrezzatura: true, suTelaio: false };
}

export function targetTypeFromInterventoOggettoChecks(
  checks: InterventoOggettoChecks,
): InterventoTargetTypeScheda {
  if (!checks.suAttrezzatura && checks.suTelaio) return "telaio";
  return "attrezzatura";
}

export function patchInterventoOggettoChecks(
  prev: InterventoOggettoChecks,
  patch: Partial<InterventoOggettoChecks>,
): Pick<SchedaIngressoFields, "interventoSuAttrezzatura" | "interventoSuTelaio" | "targetType"> {
  const next: InterventoOggettoChecks = {
    suAttrezzatura: patch.suAttrezzatura ?? prev.suAttrezzatura,
    suTelaio: patch.suTelaio ?? prev.suTelaio,
  };
  if (!next.suAttrezzatura && !next.suTelaio) {
    next.suAttrezzatura = true;
    next.suTelaio = false;
  }
  return {
    interventoSuAttrezzatura: next.suAttrezzatura,
    interventoSuTelaio: next.suTelaio,
    targetType: targetTypeFromInterventoOggettoChecks(next),
  };
}
