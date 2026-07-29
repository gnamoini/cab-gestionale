/** SSOT read/write per ore lavoro motore / PTO su scheda ingresso (JSONB campi). */

export type OreLavoroFields = {
  oreLavoroMotore: string;
  oreLavoroPto: string;
};

export type OreLavoroStorageFields = {
  oreLavoro: string;
  oreLavoroMotore: string;
  oreLavoroPto: string;
};

export const ORE_LAVORO_STORAGE_KEYS = {
  legacy: "oreLavoro",
  motore: "oreLavoroMotore",
  pto: "oreLavoroPto",
} as const;

function trimOre(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

/** Read SSOT: legacy oreLavoro → motore se motore vuoto; PTO default "". */
export function resolveOreLavoroFields(
  raw: Partial<Record<string, string | undefined | null>>,
): OreLavoroFields {
  const motoreExplicit = trimOre(raw[ORE_LAVORO_STORAGE_KEYS.motore]);
  const pto = trimOre(raw[ORE_LAVORO_STORAGE_KEYS.pto]);
  const legacy = trimOre(raw[ORE_LAVORO_STORAGE_KEYS.legacy]);
  const oreLavoroMotore = motoreExplicit || legacy;
  return { oreLavoroMotore, oreLavoroPto: pto };
}

/** Write SSOT: dual-write coerente — oreLavoro sempre = oreLavoroMotore. */
export function serializeOreLavoroFields(ore: OreLavoroFields): OreLavoroStorageFields {
  const oreLavoroMotore = trimOre(ore.oreLavoroMotore);
  const oreLavoroPto = trimOre(ore.oreLavoroPto);
  return {
    oreLavoro: oreLavoroMotore,
    oreLavoroMotore,
    oreLavoroPto,
  };
}

export function applyOreLavoroStorageToCampi(campi: Record<string, unknown>, ore: OreLavoroFields): void {
  const stored = serializeOreLavoroFields(ore);
  campi[ORE_LAVORO_STORAGE_KEYS.legacy] = stored.oreLavoro;
  campi[ORE_LAVORO_STORAGE_KEYS.motore] = stored.oreLavoroMotore;
  campi[ORE_LAVORO_STORAGE_KEYS.pto] = stored.oreLavoroPto;
}

/** Patch parziale UI → storage fields. */
export function patchOreLavoroFromUi(
  current: OreLavoroFields,
  patch: Partial<OreLavoroFields>,
): OreLavoroStorageFields {
  return serializeOreLavoroFields({
    oreLavoroMotore: patch.oreLavoroMotore ?? current.oreLavoroMotore,
    oreLavoroPto: patch.oreLavoroPto ?? current.oreLavoroPto,
  });
}

/** Estensione draft form (non in SchedaIngressoFields SSOT). */
export type SchedaIngressoOreDraft = {
  oreLavoroPto?: string;
};

export function resolveIngressoOreDraft(
  draft: { oreLavoro: string } & SchedaIngressoOreDraft,
): OreLavoroFields {
  return resolveOreLavoroFields({
    oreLavoro: draft.oreLavoro,
    oreLavoroMotore: draft.oreLavoro,
    oreLavoroPto: draft.oreLavoroPto,
  });
}

export function patchIngressoOreDraft(
  draft: { oreLavoro: string } & SchedaIngressoOreDraft,
  patch: Partial<OreLavoroFields>,
): { oreLavoro: string; oreLavoroPto: string } {
  const stored = patchOreLavoroFromUi(resolveIngressoOreDraft(draft), patch);
  return { oreLavoro: stored.oreLavoro, oreLavoroPto: stored.oreLavoroPto };
}

export function oreDraftFromRaw(
  raw: Partial<Record<string, string | undefined | null>>,
): SchedaIngressoOreDraft {
  const ore = resolveOreLavoroFields(raw);
  return { oreLavoroPto: ore.oreLavoroPto };
}

export function oreLavoroMotoreFromRaw(
  raw: Partial<Record<string, string | undefined | null>>,
): string {
  return resolveOreLavoroFields(raw).oreLavoroMotore;
}
