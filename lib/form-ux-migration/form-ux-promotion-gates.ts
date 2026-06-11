import fs from "node:fs";
import path from "node:path";
import type { MigrationRiskProfile } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { getFieldTelemetrySummary } from "@/lib/form-ux-migration/form-ux-map-telemetry-store";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { FORM_UX_MISMATCH_RATE_THRESHOLD } from "@/lib/form-ux-migration/shadow-config";
import type {
  FormUxEnforcementLevel,
  FormUxFormId,
  FormUxMigrationMode,
} from "@/lib/form-ux-migration/types";

export type PromotionGate = "A" | "B" | "C" | "D";

export type RolloutFieldPatch = {
  formId: FormUxFormId;
  fieldId: string;
  kind: MigrationInventoryField["kind"];
  mode: FormUxMigrationMode;
  enforcement?: FormUxEnforcementLevel;
};

export type PromotionVerdict = {
  gate: PromotionGate;
  eligible: boolean;
  blockers: string[];
  suggestedPatch?: RolloutFieldPatch;
  transition: string;
};

export type MapPromotionSidecar = {
  reviewApproved?: Record<string, boolean>;
  manualApproval?: Record<string, boolean>;
};

const DEFAULT_SIDECAR_PATH = "map/promotion-sidecar.json";

function readSidecar(root: string): MapPromotionSidecar {
  const file = path.join(root, DEFAULT_SIDECAR_PATH);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as MapPromotionSidecar;
  } catch {
    return {};
  }
}

function currentRollout(formId: FormUxFormId, fieldId: string) {
  return FORM_UX_ROLLOUT[formId]?.fields[fieldId];
}

function buildPatch(
  profile: MigrationRiskProfile,
  mode: FormUxMigrationMode,
  enforcement?: FormUxEnforcementLevel,
): RolloutFieldPatch | undefined {
  if (profile.formId == null) return undefined;
  return {
    formId: profile.formId,
    fieldId: profile.fieldId,
    kind: profile.kind,
    mode,
    enforcement,
  };
}

function evaluateGateA(
  profile: MigrationRiskProfile,
  field: MigrationInventoryField,
): PromotionVerdict {
  const blockers: string[] = [];
  if (profile.tier !== 0) blockers.push("tier_not_zero");
  if (profile.formId == null) blockers.push("missing_form_id");
  if (profile.fieldId.startsWith("field-")) blockers.push("uninferable_field_id");
  if (field.status !== "legacy") blockers.push("not_legacy");

  const patch = buildPatch(
    profile,
    profile.suggestedInitialMode,
    profile.suggestedEnforcement,
  );

  return {
    gate: "A",
    eligible: blockers.length === 0,
    blockers,
    suggestedPatch: patch,
    transition: "legacy → shadow/ssot (Tier 0 auto-suggest)",
  };
}

function evaluateGateB(
  profile: MigrationRiskProfile,
  field: MigrationInventoryField,
  root: string,
): PromotionVerdict {
  const blockers: string[] = [];
  if (profile.tier !== 1) blockers.push("tier_not_one");

  const rollout = profile.formId
    ? currentRollout(profile.formId, profile.fieldId)
    : undefined;
  if (!rollout || rollout.mode !== "shadow") {
    blockers.push("not_in_shadow_mode");
  }

  const telemetry = getFieldTelemetrySummary(profile.fieldKey, { root, windowDays: 7 });
  if (!telemetry.hasData) {
    blockers.push("no_telemetry_snapshot");
  } else {
    if (telemetry.mismatchCount > 0) blockers.push("mismatch_detected");
    if (telemetry.mismatchRate >= FORM_UX_MISMATCH_RATE_THRESHOLD) {
      blockers.push("mismatch_rate_above_threshold");
    }
    if (telemetry.daysCovered < 7) blockers.push("insufficient_telemetry_days");
  }

  const patch = buildPatch(profile, "ssot", "soft-ssot");

  return {
    gate: "B",
    eligible: blockers.length === 0,
    blockers,
    suggestedPatch: patch,
    transition: "shadow → ssot (Tier 1 telemetry gate)",
  };
}

function evaluateGateC(
  profile: MigrationRiskProfile,
  root: string,
): PromotionVerdict {
  const blockers: string[] = [];
  if (profile.tier !== 2) blockers.push("tier_not_two");

  const sidecar = readSidecar(root);
  if (!sidecar.reviewApproved?.[profile.fieldKey]) {
    blockers.push("review_not_approved");
  }

  const patch = buildPatch(profile, "shadow", "warn");

  return {
    gate: "C",
    eligible: blockers.length === 0,
    blockers,
    suggestedPatch: patch,
    transition: "Tier 2 — review required",
  };
}

function evaluateGateD(
  profile: MigrationRiskProfile,
  root: string,
): PromotionVerdict {
  const blockers: string[] = [];
  if (profile.tier !== 3) blockers.push("tier_not_three");

  const sidecar = readSidecar(root);
  if (!sidecar.manualApproval?.[profile.fieldKey]) {
    blockers.push("manual_approval_missing");
  }

  const patch = buildPatch(profile, "shadow", "warn");

  return {
    gate: "D",
    eligible: blockers.length === 0,
    blockers,
    suggestedPatch: patch,
    transition: "Tier 3 — manual approval required",
  };
}

export function evaluatePromotion(
  field: MigrationInventoryField,
  options?: { root?: string },
): PromotionVerdict[] {
  const root = options?.root ?? process.cwd();
  const profile = classifyMigrationField(field, { root });

  return [
    evaluateGateA(profile, field),
    evaluateGateB(profile, field, root),
    evaluateGateC(profile, root),
    evaluateGateD(profile, root),
  ];
}

export function generateRolloutConfigPatch(verdicts: PromotionVerdict[]): string {
  const eligible = verdicts.filter((v) => v.eligible && v.suggestedPatch);
  if (eligible.length === 0) {
    return "// No eligible promotion patches";
  }

  const lines: string[] = [
    "// Suggested rollout-config.ts patches (manual apply only)",
    "",
  ];

  for (const verdict of eligible) {
    const p = verdict.suggestedPatch!;
    lines.push(`// Gate ${verdict.gate}: ${verdict.transition}`);
    lines.push(`"${p.fieldId}": {`);
    lines.push(`  kind: "${p.kind}",`);
    lines.push(`  mode: "${p.mode}",`);
    if (p.enforcement) {
      lines.push(`  enforcement: "${p.enforcement}",`);
    }
    lines.push(`},`);
    lines.push("");
  }

  return lines.join("\n");
}
