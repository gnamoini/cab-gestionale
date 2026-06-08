import type { FormEngineSections, FormEngineSnapshot, FormStateSnapshot } from "@/lib/forms/form-engine/types";

/** Deep-clone plain object/array per snapshot immutabile. */
export function freezeSnapshot<T>(value: T): FormStateSnapshot<T> {
  if (typeof structuredClone === "function") {
    return structuredClone(value) as FormStateSnapshot<T>;
  }
  return JSON.parse(JSON.stringify(value)) as FormStateSnapshot<T>;
}

/** Cattura snapshot da ref sync (chiamare dopo prepareFormSubmit / ios guard). */
export function captureFormSnapshot<T>(read: () => T): FormStateSnapshot<T> {
  return freezeSnapshot(read());
}

/** Snapshot multi-sezione (lav-create: fields + meta). */
export function captureFormSnapshotSections<S extends FormEngineSections>(
  readers: { [K in keyof S]: () => S[K] },
): FormEngineSnapshot<S> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(readers) as (keyof S)[]) {
    out[key as string] = freezeSnapshot(readers[key]());
  }
  return out as FormEngineSnapshot<S>;
}
