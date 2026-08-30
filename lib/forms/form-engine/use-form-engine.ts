"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import {
  captureFormSnapshot,
  captureFormSnapshotSections,
} from "@/lib/forms/form-engine/capture-form-snapshot";
import { isFormEngineEnabled } from "@/lib/forms/form-engine/config";
import { prepareFormSubmit, prepareFormSubmitAsync } from "@/lib/forms/form-engine/prepare-form-submit";
import { createSubmitLock, type FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type { FormEngineSections, FormEngineSnapshot, FormStateSnapshot } from "@/lib/forms/form-engine/types";

export type UseFormEngineResult<T> = {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  patch: (partial: Partial<T>) => void;
  reset: (next?: T) => void;
  ref: React.RefObject<T>;
  getSnapshot: () => FormStateSnapshot<T>;
  submitLock: FormSubmitLock;
  runSubmit: (
    root: HTMLElement | null,
    handler: (snap: FormStateSnapshot<T>) => void | Promise<void>,
  ) => Promise<void>;
  formProps: ReturnType<typeof gestionaleFormFocusScopeProps>;
};

export function useFormEngine<T extends object>(options: {
  initial: T;
  enabled?: boolean;
}): UseFormEngineResult<T> {
  const enabled = options.enabled ?? isFormEngineEnabled();
  const initialRef = useRef(options.initial);
  const [value, setValueState] = useState<T>(options.initial);
  const ref = useRef(value);
  const submitLock = useMemo(() => createSubmitLock(), []);

  useLayoutEffect(() => {
    initialRef.current = options.initial;
  }, [options.initial]);

  const setValue = useCallback((action: SetStateAction<T>) => {
    setValueState((prev) => {
      const resolved = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      ref.current = resolved;
      return resolved;
    });
  }, []);

  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);

  const patch = useCallback(
    (partial: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...partial }));
    },
    [setValue],
  );

  const reset = useCallback(
    (next?: T) => {
      const resolved = next ?? initialRef.current;
      ref.current = resolved;
      setValueState(resolved);
    },
    [],
  );

  const getSnapshot = useCallback((): FormStateSnapshot<T> => {
    return captureFormSnapshot(() => ref.current);
  }, []);

  const runSubmit = useCallback(
    async (
      root: HTMLElement | null,
      handler: (snap: FormStateSnapshot<T>) => void | Promise<void>,
    ) => {
      if (!submitLock.acquire()) return;
      try {
        if (enabled) {
          await prepareFormSubmitAsync(root);
        } else {
          prepareFormSubmit(root);
        }
        await handler(getSnapshot());
      } finally {
        submitLock.release();
      }
    },
    [enabled, getSnapshot, submitLock],
  );

  const formProps = useMemo(() => gestionaleFormFocusScopeProps(), []);

  return {
    value,
    setValue,
    patch,
    reset,
    ref,
    getSnapshot,
    submitLock,
    runSubmit,
    formProps,
  };
}

type SectionConfig<S extends FormEngineSections> = {
  [K in keyof S]: { initial: S[K] };
};

export type UseFormEngineSectionsResult<S extends FormEngineSections> = {
  values: S;
  setSection: <K extends keyof S>(key: K, value: S[K] | ((prev: S[K]) => S[K])) => void;
  patchSection: <K extends keyof S>(key: K, partial: Partial<S[K]>) => void;
  resetSections: (next?: Partial<S>) => void;
  refs: { [K in keyof S]: React.RefObject<S[K]> };
  getSnapshot: () => FormEngineSnapshot<S>;
  submitLock: FormSubmitLock;
  runSubmit: (
    root: HTMLElement | null,
    handler: (snap: FormEngineSnapshot<S>) => void | Promise<void>,
  ) => Promise<void>;
  formProps: ReturnType<typeof gestionaleFormFocusScopeProps>;
};

export function useFormEngineSections<S extends FormEngineSections>(options: {
  sections: SectionConfig<S>;
  enabled?: boolean;
}): UseFormEngineSectionsResult<S> {
  const enabled = options.enabled ?? isFormEngineEnabled();
  const [sectionKeys] = useState(() => Object.keys(options.sections) as (keyof S)[]);
  const sectionsConfigRef = useRef(options.sections);

  useLayoutEffect(() => {
    sectionsConfigRef.current = options.sections;
  }, [options.sections]);

  const buildInitial = useCallback((): S => {
    const out = {} as S;
    for (const key of sectionKeys) {
      out[key] = sectionsConfigRef.current[key].initial;
    }
    return out;
  }, [sectionKeys]);

  const [values, setValuesState] = useState<S>(() => {
    const out = {} as S;
    for (const key of sectionKeys) {
      out[key] = options.sections[key].initial;
    }
    return out;
  });
  const refsMap = useRef<{ [K in keyof S]?: S[K] }>({});

  const syncAllRefs = useCallback((next: S) => {
    for (const key of sectionKeys) {
      refsMap.current[key] = next[key];
    }
  }, [sectionKeys]);

  useLayoutEffect(() => {
    syncAllRefs(values);
  }, [values, syncAllRefs]);

  const submitLock = useMemo(() => createSubmitLock(), []);

  const setSection = useCallback(
    <K extends keyof S>(key: K, value: S[K] | ((prev: S[K]) => S[K])) => {
      setValuesState((prev) => {
        const resolved =
          typeof value === "function" ? (value as (p: S[K]) => S[K])(prev[key]) : value;
        const next = { ...prev, [key]: resolved };
        refsMap.current[key] = resolved;
        return next;
      });
    },
    [],
  );

  const patchSection = useCallback(
    <K extends keyof S>(key: K, partial: Partial<S[K]>) => {
      setSection(key, (prev) => ({
        ...(prev as Record<string, unknown>),
        ...(partial as Record<string, unknown>),
      }) as S[K]);
    },
    [setSection],
  );

  const resetSections = useCallback(
    (next?: Partial<S>) => {
      const base = buildInitial();
      const merged = next ? ({ ...base, ...next } as S) : base;
      syncAllRefs(merged);
      setValuesState(merged);
    },
    [buildInitial, syncAllRefs],
  );

  const getSnapshot = useCallback((): FormEngineSnapshot<S> => {
    const readers = {} as { [K in keyof S]: () => S[K] };
    for (const key of sectionKeys) {
      readers[key] = () => refsMap.current[key] as S[typeof key];
    }
    return captureFormSnapshotSections(readers);
  }, [sectionKeys]);

  const runSubmit = useCallback(
    async (
      root: HTMLElement | null,
      handler: (snap: FormEngineSnapshot<S>) => void | Promise<void>,
    ) => {
      if (!submitLock.acquire()) return;
      try {
        if (enabled) {
          await prepareFormSubmitAsync(root);
        } else {
          prepareFormSubmit(root);
        }
        await handler(getSnapshot());
      } finally {
        submitLock.release();
      }
    },
    [enabled, getSnapshot, submitLock],
  );

  const formProps = useMemo(() => gestionaleFormFocusScopeProps(), []);

  const refs = useMemo(() => {
    const out = {} as { [K in keyof S]: React.RefObject<S[K]> };
    for (const key of sectionKeys) {
      out[key] = {
        get current() {
          return refsMap.current[key] as S[typeof key];
        },
        set current(v: S[typeof key]) {
          refsMap.current[key] = v;
        },
      };
    }
    return out;
  }, [sectionKeys]);

  return {
    values,
    setSection,
    patchSection,
    resetSections,
    refs,
    getSnapshot,
    submitLock,
    runSubmit,
    formProps,
  };
}
