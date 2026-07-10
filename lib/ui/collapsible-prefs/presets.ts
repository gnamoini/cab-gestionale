import type { CollapsiblePrefValue } from "@/lib/ui/collapsible-prefs/types";
import type { UseCollapsiblePreferenceOptions } from "@/lib/ui/collapsible-prefs/use-collapsible-preference";

type PrefBase = Pick<UseCollapsiblePreferenceOptions<unknown>, "scope" | "key" | "userId" | "persist">;

/** `true` = sezione espansa. */
export function collapsibleExpandedBoolPref(
  defaultExpanded: boolean,
  base: PrefBase,
): UseCollapsiblePreferenceOptions<boolean> {
  return {
    ...base,
    defaultValue: defaultExpanded,
    serialize: (v) => v,
    deserialize: (raw, fallback) => (typeof raw === "boolean" ? raw : fallback),
  };
}

/** `true` = sezione collassata (invertito rispetto a expanded). */
export function collapsibleCollapsedBoolPref(
  defaultCollapsed: boolean,
  base: PrefBase,
): UseCollapsiblePreferenceOptions<boolean> {
  return {
    ...base,
    defaultValue: defaultCollapsed,
    serialize: (v) => v,
    deserialize: (raw, fallback) => (typeof raw === "boolean" ? raw : fallback),
  };
}

/** Set di id espansi ↔ string[] in storage. */
export function collapsibleSetPref(
  defaultIds: Iterable<string>,
  base: PrefBase,
): UseCollapsiblePreferenceOptions<Set<string>> {
  const fallback = new Set(defaultIds);
  return {
    ...base,
    defaultValue: fallback,
    serialize: (v) => [...v],
    deserialize: (raw, fb) => {
      if (!Array.isArray(raw)) return new Set(fb);
      return new Set(raw.filter((x): x is string => typeof x === "string"));
    },
  };
}

/** Accordion one-open: string id o "" / null se tutti chiusi. */
export function collapsibleAccordionPref(
  defaultId: string | null,
  base: PrefBase,
): UseCollapsiblePreferenceOptions<string> {
  return {
    ...base,
    defaultValue: defaultId ?? "",
    serialize: (v) => v,
    deserialize: (raw, fallback) => (typeof raw === "string" ? raw : fallback),
  };
}

export type { CollapsiblePrefValue };
