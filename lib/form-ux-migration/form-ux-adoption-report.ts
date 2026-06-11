import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationRiskTier } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import {
  scanMigrationInventory,
  summarizeInventoryCoverage,
  type MigrationInventoryField,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { computeBurndownTrend } from "@/lib/form-ux-migration/form-ux-legacy-burndown";
import type {
  FormUxDomain,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

export type AdoptionSlice = {
  total: number;
  ssot: number;
  legacy: number;
  shadow: number;
  hybrid: number;
  ssotPct: number;
  legacyPct: number;
  shadowPct: number;
};

export type FormUxAdoptionReport = {
  generatedAt: string;
  global: AdoptionSlice & { totalFields: number };
  byDomain: Partial<Record<FormUxDomain, AdoptionSlice>>;
  byForm: Partial<Record<FormUxFormId, AdoptionSlice>>;
  byKind: Partial<Record<FormUxInputKind, AdoptionSlice>>;
  byTier: Record<MigrationRiskTier, { legacy: number; ssot: number; total: number }>;
};

export type MapSuccessMetrics = {
  ssotAdoptionPct: number;
  migrationVelocity: number;
  rollbackRate: number;
  mismatchRate: number;
  promotionRate: number;
};

const ALL_DOMAINS: FormUxDomain[] = [
  "ricambio",
  "lavorazioni",
  "mezzi",
  "preventivi",
  "settings",
];

const ALL_FORMS: FormUxFormId[] = [
  "ricambio",
  "scheda-ingresso",
  "lavorazioni",
  "mezzi",
  "preventivi",
  "settings",
];

const ALL_KINDS: FormUxInputKind[] = [
  "text",
  "number",
  "select",
  "textarea",
  "checkbox",
  "numberStepper",
];

function buildSlice(fields: MigrationInventoryField[]): AdoptionSlice {
  const total = fields.length;
  const legacy = fields.filter((f) => f.status === "legacy").length;
  const shadow = fields.filter((f) => f.status === "shadow").length;
  const ssot = fields.filter((f) => f.status === "ssot").length;
  const hybrid = fields.filter((f) => f.status === "hybrid").length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    total,
    ssot,
    legacy,
    shadow,
    hybrid,
    ssotPct: pct(ssot + hybrid),
    legacyPct: pct(legacy),
    shadowPct: pct(shadow),
  };
}

const KIND_LABELS: Record<FormUxInputKind, string> = {
  text: "Text",
  number: "Numerici",
  select: "Select",
  textarea: "Textarea",
  checkbox: "Checkbox",
  numberStepper: "NumberStepper",
};

export function buildAdoptionReport(options?: { root?: string }): FormUxAdoptionReport {
  const { fields } = scanMigrationInventory({ root: options?.root });
  const profiles = classifyAllFields(fields, { root: options?.root });
  const globalSummary = summarizeInventoryCoverage(fields);
  const globalSlice = buildSlice(fields);

  const byDomain: Partial<Record<FormUxDomain, AdoptionSlice>> = {};
  for (const domain of ALL_DOMAINS) {
    const subset = fields.filter((f) => f.domain === domain);
    if (subset.length > 0) byDomain[domain] = buildSlice(subset);
  }

  const byForm: Partial<Record<FormUxFormId, AdoptionSlice>> = {};
  for (const formId of ALL_FORMS) {
    const subset = fields.filter((f) => f.formId === formId);
    if (subset.length > 0) byForm[formId] = buildSlice(subset);
  }

  const byKind: Partial<Record<FormUxInputKind, AdoptionSlice>> = {};
  for (const kind of ALL_KINDS) {
    const subset = fields.filter((f) => f.kind === kind);
    if (subset.length > 0) byKind[kind] = buildSlice(subset);
  }

  const byTier: FormUxAdoptionReport["byTier"] = {
    0: { legacy: 0, ssot: 0, total: 0 },
    1: { legacy: 0, ssot: 0, total: 0 },
    2: { legacy: 0, ssot: 0, total: 0 },
    3: { legacy: 0, ssot: 0, total: 0 },
  };

  for (const profile of profiles) {
    const bucket = byTier[profile.tier];
    bucket.total += 1;
    if (profile.status === "legacy") bucket.legacy += 1;
    else bucket.ssot += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    global: {
      ...globalSlice,
      totalFields: globalSummary.total,
      ssotPct: globalSummary.total > 0
        ? Math.round(((globalSummary.ssot + globalSummary.hybrid) / globalSummary.total) * 100)
        : 100,
    },
    byDomain,
    byForm,
    byKind,
    byTier,
  };
}

export function formatAdoptionReportText(report: FormUxAdoptionReport): string {
  const lines: string[] = [
    "Form UX Adoption Report",
    "=========================",
    `Generated: ${report.generatedAt}`,
    "",
    `Global SSOT: ${report.global.ssotPct}%`,
    `Global Legacy: ${report.global.legacyPct}%`,
    `Global Shadow: ${report.global.shadowPct}%`,
    `Total fields: ${report.global.totalFields}`,
    "",
    "Per tipo",
  ];

  for (const kind of ALL_KINDS) {
    const slice = report.byKind[kind];
    if (!slice) continue;
    lines.push(`${KIND_LABELS[kind]}`);
    lines.push(`  SSOT ${slice.ssotPct}%`);
    lines.push(`  Legacy ${slice.legacyPct}%`);
  }

  return lines.join("\n");
}

export function computeMapSuccessMetrics(options?: { root?: string }): MapSuccessMetrics {
  const report = buildAdoptionReport(options);
  const trend = computeBurndownTrend(options);

  return {
    ssotAdoptionPct: report.global.ssotPct,
    migrationVelocity: trend.velocityFieldsPerWeek,
    rollbackRate: trend.rollbackRate,
    mismatchRate: trend.mismatchRate,
    promotionRate: trend.promotionRate,
  };
}
