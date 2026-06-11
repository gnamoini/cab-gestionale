import type { MigrationRiskProfile, MigrationRiskTier } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { FormUxDomain, FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type MigrationWave = {
  wave: number;
  label: string;
  tier: MigrationRiskTier;
  fields: MigrationRiskProfile[];
  fieldCount: number;
  estimatedDays: number;
};

const DOMAIN_PRIORITY: Record<FormUxDomain, number> = {
  ricambio: 0,
  lavorazioni: 1,
  mezzi: 2,
  preventivi: 3,
  settings: 4,
};

const FORM_DOMAIN: Record<FormUxFormId, FormUxDomain> = {
  ricambio: "ricambio",
  "scheda-ingresso": "lavorazioni",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  preventivi: "preventivi",
  settings: "settings",
};

const KIND_PRIORITY: Record<FormUxInputKind, number> = {
  checkbox: 0,
  text: 1,
  textarea: 2,
  number: 3,
  select: 4,
  numberStepper: 5,
};

const WAVE_LABELS: Record<MigrationRiskTier, string> = {
  0: "rischio basso",
  1: "rischio medio",
  2: "rischio alto",
  3: "critici",
};

function domainPriority(profile: MigrationRiskProfile): number {
  if (profile.formId == null) return 99;
  return DOMAIN_PRIORITY[FORM_DOMAIN[profile.formId]] ?? 99;
}

function sortProfiles(profiles: MigrationRiskProfile[]): MigrationRiskProfile[] {
  return [...profiles].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const domainDiff = domainPriority(a) - domainPriority(b);
    if (domainDiff !== 0) return domainDiff;
    const kindDiff = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (kindDiff !== 0) return kindDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    return a.line - b.line;
  });
}

export function buildMigrationWaves(
  profiles: MigrationRiskProfile[],
  options?: { velocityFieldsPerWeek?: number },
): MigrationWave[] {
  const velocity = options?.velocityFieldsPerWeek ?? 8;
  const legacyProfiles = profiles.filter((p) => p.status === "legacy");
  const sorted = sortProfiles(legacyProfiles);

  const tiers = [0, 1, 2, 3] as const;
  const waves: MigrationWave[] = [];

  for (let i = 0; i < tiers.length; i += 1) {
    const tier = tiers[i]!;
    const fields = sorted.filter(
      (p) =>
        p.tier === tier &&
        (tier !== 0 || p.tierBand === "0" || p.isRecalibratedTier0),
    );
    if (fields.length === 0) continue;

    waves.push({
      wave: waves.length + 1,
      label: WAVE_LABELS[tier],
      tier,
      fields,
      fieldCount: fields.length,
      estimatedDays: Math.ceil((fields.length / velocity) * 5),
    });
  }

  return waves;
}

export function formatRoadmapText(waves: MigrationWave[]): string {
  const lines: string[] = [];
  for (const wave of waves) {
    lines.push(`Wave ${wave.wave}`);
    lines.push(`  ${wave.fieldCount} campi`);
    lines.push(`  ${wave.label}`);
    lines.push(`  ETA stimata: ${wave.estimatedDays} giorni`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
