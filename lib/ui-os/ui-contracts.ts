/**
 * UI OS — contratti UI per variant (bridge verso Design System Lock).
 */

import {
  FLEX_CONTRACT,
  MODAL_CONTRACT,
  TABLE_CONTRACT,
  TOOLBAR_CONTRACT,
} from "@/lib/ui-design-system-lock/component-contracts";
import type {
  LayoutVariant,
  ModalVariant,
  TableVariant,
  ToolbarVariant,
  UIDensity,
} from "@/lib/ui-os/ui-schema";

export type UIContractType = "toolbar" | "table" | "modal" | "layout";

export type UIContract = {
  type: UIContractType;
  allowedVariants: string[];
  spacingRules: readonly string[];
  flexPolicy: "strict" | "loose";
  layoutConstraints: readonly string[];
};

export const TOOLBAR_VARIANT_CONTRACTS: Record<ToolbarVariant, UIContract> = {
  standard: {
    type: "toolbar",
    allowedVariants: ["standard"],
    spacingRules: TOOLBAR_CONTRACT.allowedGaps,
    flexPolicy: "strict",
    layoutConstraints: [
      TOOLBAR_CONTRACT.rowToken,
      ...TOOLBAR_CONTRACT.shellTokens,
      ...TOOLBAR_CONTRACT.searchRequired,
    ],
  },
  dense: {
    type: "toolbar",
    allowedVariants: ["dense"],
    spacingRules: ["gap-1.5", "gap-2"],
    flexPolicy: "strict",
    layoutConstraints: [TOOLBAR_CONTRACT.rowToken],
  },
  legacy: {
    type: "toolbar",
    allowedVariants: ["legacy"],
    spacingRules: [],
    flexPolicy: "loose",
    layoutConstraints: ["PageHeader"],
  },
};

export const TABLE_VARIANT_CONTRACTS: Record<TableVariant, UIContract> = {
  global: {
    type: "table",
    allowedVariants: ["global"],
    spacingRules: [TABLE_CONTRACT.canonicalTh, TABLE_CONTRACT.canonicalTd],
    flexPolicy: "strict",
    layoutConstraints: [...TABLE_CONTRACT.shellComponents, ...TABLE_CONTRACT.headComponents],
  },
  legacy: {
    type: "table",
    allowedVariants: ["legacy"],
    spacingRules: [],
    flexPolicy: "loose",
    layoutConstraints: [],
  },
};

export const MODAL_VARIANT_CONTRACTS: Record<ModalVariant, UIContract> = {
  ds: {
    type: "modal",
    allowedVariants: ["ds"],
    spacingRules: [...MODAL_CONTRACT.headerPadding, ...MODAL_CONTRACT.bodyPadding],
    flexPolicy: "strict",
    layoutConstraints: [...MODAL_CONTRACT.panelTokens, ...MODAL_CONTRACT.bodyTokens],
  },
  "gestionale-shell": {
    type: "modal",
    allowedVariants: ["gestionale-shell"],
    spacingRules: MODAL_CONTRACT.headerPadding,
    flexPolicy: "strict",
    layoutConstraints: [...MODAL_CONTRACT.shellComponents, "gestionaleModalBodyFlexClass"],
  },
  legacy: {
    type: "modal",
    allowedVariants: ["legacy"],
    spacingRules: [],
    flexPolicy: "loose",
    layoutConstraints: [],
  },
};

export const LAYOUT_VARIANT_CONTRACTS: Record<LayoutVariant, UIContract> = {
  "gestionale-core": {
    type: "layout",
    allowedVariants: ["gestionale-core"],
    spacingRules: ["layoutPageRoot", "gestionale-responsive-core"],
    flexPolicy: "strict",
    layoutConstraints: [...FLEX_CONTRACT.containmentMarkers],
  },
  "report-dashboard": {
    type: "layout",
    allowedVariants: ["report-dashboard"],
    spacingRules: ["dsStackPage"],
    flexPolicy: "loose",
    layoutConstraints: ["ReportKpiGrid", "PageHeader"],
  },
  legacy: {
    type: "layout",
    allowedVariants: ["legacy"],
    spacingRules: [],
    flexPolicy: "loose",
    layoutConstraints: [],
  },
};

export const DENSITY_SPACING: Record<UIDensity, string> = {
  compact: "gap-1.5",
  normal: "gap-2",
  comfortable: "gap-3",
};

export function getContractForSchemaField(
  field: "toolbar" | "table" | "modal" | "layout",
  value: string | undefined,
): UIContract | null {
  if (!value) return null;
  switch (field) {
    case "toolbar":
      return TOOLBAR_VARIANT_CONTRACTS[value as ToolbarVariant] ?? null;
    case "table":
      return TABLE_VARIANT_CONTRACTS[value as TableVariant] ?? null;
    case "modal":
      return MODAL_VARIANT_CONTRACTS[value as ModalVariant] ?? null;
    case "layout":
      return LAYOUT_VARIANT_CONTRACTS[value as LayoutVariant] ?? null;
    default:
      return null;
  }
}
