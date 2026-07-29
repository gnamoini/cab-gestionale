import type { SchedaIngressoFields } from "@/types/schede";

export type CaptureCompileFieldDirtyMap = Partial<Record<keyof SchedaIngressoFields, boolean>>;

export function markCaptureCompileFieldDirty(
  dirty: CaptureCompileFieldDirtyMap,
  key: keyof SchedaIngressoFields,
): CaptureCompileFieldDirtyMap {
  if (dirty[key]) return dirty;
  return { ...dirty, [key]: true };
}

export function mergeCaptureCompileFieldsRespectingDirty(input: {
  current: SchedaIngressoFields;
  incoming: SchedaIngressoFields;
  dirty: CaptureCompileFieldDirtyMap;
}): SchedaIngressoFields {
  const next = { ...input.current };
  for (const key of Object.keys(input.incoming) as Array<keyof SchedaIngressoFields>) {
    if (input.dirty[key]) continue;
    const value = input.incoming[key];
    if (value !== undefined) {
      (next as Record<keyof SchedaIngressoFields, SchedaIngressoFields[keyof SchedaIngressoFields]>)[key] =
        value as SchedaIngressoFields[typeof key];
    }
  }
  return next;
}
