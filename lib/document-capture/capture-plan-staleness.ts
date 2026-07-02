import { createHash } from "node:crypto";

export function hashConfirmedCaptureFields(
  fields: ReadonlyArray<{ field_key: string; confirmed_value: string | null }>,
): string {
  const canonical = fields
    .map((f) => `${f.field_key}:${f.confirmed_value ?? ""}`)
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export class CapturePlanStaleError extends Error {
  readonly code = "PLAN_STALE" as const;

  constructor() {
    super("Piano apply obsoleto — ripetere dry-run.");
    this.name = "CapturePlanStaleError";
  }
}
