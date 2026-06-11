import type { FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

/** SSOT metadata per input kind — no React imports (avoids cycles). */
export type FormUxSsotMeta = {
  component: string;
  exportPath: string;
};

export const INPUT_KIND_SSOT: Record<FormUxInputKind, FormUxSsotMeta> = {
  text: {
    component: "MigratedTextInput",
    exportPath: "@/components/form-ux-migration/migrated-text-input",
  },
  number: {
    component: "GestionaleNumberInput",
    exportPath: "@/components/gestionale/gestionale-number-input",
  },
  select: {
    component: "GlobalSelect",
    exportPath: "@/components/gestionale/global-input/global-select",
  },
  textarea: {
    component: "GestionaleTextarea",
    exportPath: "@/components/gestionale/gestionale-textarea",
  },
  checkbox: {
    component: "dsInput",
    exportPath: "@/lib/ui/design-system",
  },
  numberStepper: {
    component: "MigratedNumberStepper",
    exportPath: "@/components/form-ux-migration/migrated-number-stepper",
  },
};

/** Infer form id from component file path (inventory / codemod). */
export function inferFormIdFromPath(filePath: string): FormUxFormId | null {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("magazzino/ricambio") || normalized.includes("ricambio-form")) return "ricambio";
  if (normalized.includes("scheda-ingresso") || normalized.includes("schede/")) return "scheda-ingresso";
  if (normalized.includes("lavorazioni/")) return "lavorazioni";
  if (normalized.includes("mezzi/")) return "mezzi";
  if (normalized.includes("preventivi/")) return "preventivi";
  if (normalized.includes("settings/") || normalized.includes("dashboard/settings")) return "settings";
  return null;
}

/** Default kind when not declared in rollout config. */
export function defaultKindForInferredInput(sourceSnippet: string): FormUxInputKind {
  if (/type=["']number["']/.test(sourceSnippet)) return "number";
  if (/<textarea/.test(sourceSnippet)) return "textarea";
  if (/<select/.test(sourceSnippet)) return "select";
  if (/type=["']checkbox["']/.test(sourceSnippet)) return "checkbox";
  return "text";
}
