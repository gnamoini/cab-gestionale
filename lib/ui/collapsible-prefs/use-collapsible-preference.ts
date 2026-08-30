"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { readSection, writeSection } from "@/lib/ui/collapsible-prefs/storage";
import type { CollapsiblePrefValue } from "@/lib/ui/collapsible-prefs/types";

function collapsiblePrefValuesEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
  return false;
}

export type UseCollapsiblePreferenceOptions<T> = {
  userId: string | null;
  scope: string;
  key: string;
  defaultValue: T;
  persist?: boolean;
  serialize: (v: T) => CollapsiblePrefValue;
  deserialize: (raw: CollapsiblePrefValue | undefined, fallback: T) => T;
};

export function useCollapsiblePreference<T>(
  options: UseCollapsiblePreferenceOptions<T>,
): [value: T, setValue: (v: T | ((prev: T) => T)) => void, hydrated: boolean] {
  const {
    userId,
    scope,
    key,
    defaultValue,
    persist = true,
    serialize,
    deserialize,
  } = options;

  const shouldPersist = persist && Boolean(userId);
  const serializeRef = useRef(serialize);
  const deserializeRef = useRef(deserialize);
  const defaultValueRef = useRef(defaultValue);

  useLayoutEffect(() => {
    serializeRef.current = serialize;
    deserializeRef.current = deserialize;
    defaultValueRef.current = defaultValue;
  }, [serialize, deserialize, defaultValue]);

  const [value, setValueState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(!shouldPersist);
  const userTouchedRef = useRef(false);

  useEffect(() => {
    if (!shouldPersist) {
      return;
    }
    if (userTouchedRef.current) {
      setHydrated(true);
      return;
    }
    const stored = readSection(userId!, scope, key, defaultValueRef.current, (raw, fb) =>
      deserializeRef.current(raw, fb),
    );
    setValueState((prev) => (collapsiblePrefValuesEqual(stored, prev) ? prev : stored));
    setHydrated(true);
  }, [shouldPersist, userId, scope, key]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      userTouchedRef.current = true;
      setValueState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (shouldPersist && userId) {
          writeSection(userId, scope, key, resolved, (v) => serializeRef.current(v));
        }
        return resolved;
      });
    },
    [shouldPersist, userId, scope, key],
  );

  return [value, setValue, hydrated] as const;
}
