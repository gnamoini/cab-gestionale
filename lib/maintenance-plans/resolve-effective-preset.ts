import type { ReplacementCondition } from "@/lib/maintenance-plans/maintenance-enums";

export type EffectivePart = {
  ricambioId: string;
  codice: string;
  descrizione: string;
  quantita: number;
  isRequired: boolean;
  replacementCondition: ReplacementCondition;
  conditionParams: Record<string, number> | null;
  sortOrder: number;
  note: string;
};

export type PresetPartSource = {
  ricambioId: string;
  codice: string;
  descrizione: string;
  quantita: number;
  isRequired?: boolean;
  replacementCondition?: ReplacementCondition;
  conditionParams?: Record<string, number> | null;
  sortOrder?: number;
  note?: string;
};

/** Merge parts: child overrides parent by ricambioId. */
export function mergePresetParts(
  base: PresetPartSource[],
  override: PresetPartSource[],
): EffectivePart[] {
  const map = new Map<string, EffectivePart>();
  for (const p of base) {
    map.set(p.ricambioId, toEffective(p));
  }
  for (const p of override) {
    map.set(p.ricambioId, toEffective(p));
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.descrizione.localeCompare(b.descrizione));
}

function toEffective(p: PresetPartSource): EffectivePart {
  return {
    ricambioId: p.ricambioId,
    codice: p.codice,
    descrizione: p.descrizione,
    quantita: p.quantita,
    isRequired: p.isRequired ?? true,
    replacementCondition: p.replacementCondition ?? "sempre",
    conditionParams: p.conditionParams ?? null,
    sortOrder: p.sortOrder ?? 0,
    note: p.note?.trim() ?? "",
  };
}

export type ResolveEffectivePresetInput = {
  presetId: string;
  presetNome: string;
  intervalType: "ore" | "km" | "giorni";
  intervalValue: number;
  baseParts: PresetPartSource[];
  vehicleOverrideParts?: PresetPartSource[];
  modelOverrideParts?: PresetPartSource[];
};

export type EffectivePreset = {
  presetId: string;
  nome: string;
  intervalType: "ore" | "km" | "giorni";
  intervalValue: number;
  parts: EffectivePart[];
};

export function resolveEffectivePreset(input: ResolveEffectivePresetInput): EffectivePreset {
  const merged = mergePresetParts(
    mergePresetParts(input.baseParts, input.modelOverrideParts ?? []),
    input.vehicleOverrideParts ?? [],
  );
  return {
    presetId: input.presetId,
    nome: input.presetNome,
    intervalType: input.intervalType,
    intervalValue: input.intervalValue,
    parts: merged,
  };
}
