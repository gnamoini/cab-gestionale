import type { ImportExportFieldDef } from "@/lib/data-import/core/field-schema";

export type MergePolicy = "PATCH" | "REPLACE" | "SMART";

export type MergeContext = {
  policy: MergePolicy;
  emptyStringClears?: boolean;
  field?: ImportExportFieldDef;
};

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/** SSOT: decide se applicare un valore in merge/update. */
export function shouldApplyMergeValue(
  incoming: unknown,
  existing: unknown,
  ctx: MergeContext,
): boolean {
  const policy = ctx.field?.mergePolicyOverride ?? ctx.policy;

  if (policy === "REPLACE") {
    if (isEmptyValue(incoming) && !ctx.emptyStringClears) return false;
    return true;
  }

  if (policy === "PATCH") {
    if (isEmptyValue(incoming)) return false;
    return true;
  }

  // SMART: plugin may override; default = PATCH + preserve false/0
  if (policy === "SMART") {
    if (isEmptyValue(incoming)) return false;
    if (typeof incoming === "number" || typeof incoming === "boolean") return true;
    if (ctx.field?.dataType === "json" && typeof incoming === "object") return true;
    return !isEmptyValue(incoming);
  }

  return false;
}

export function applyMergePatch<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>,
  ctx: Omit<MergeContext, "field"> & { fields?: ImportExportFieldDef[] },
): T {
  const out = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const field = ctx.fields?.find((f) => f.key === key);
    if (!shouldApplyMergeValue(value, existing[key], { ...ctx, field })) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
