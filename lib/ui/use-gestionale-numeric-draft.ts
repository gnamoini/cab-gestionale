"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  commitNumericDraft,
  resolveCommittedNumber,
} from "@/lib/core/numeric-input-commit";
import { isDecimalInputDraft } from "@/lib/core/decimal-input";
import type { NumericInputPreset } from "@/lib/core/numeric-input-policy";

export type UseGestionaleNumericDraftOptions = {
  value: number;
  preset: NumericInputPreset;
  onCommit: (value: number) => void;
  readOnly?: boolean;
  allowNegative?: boolean;
};

function formatCommittedValue(value: number, precision: number | undefined): string {
  if (!Number.isFinite(value)) return "";
  if (precision === undefined) return String(value);
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

export function useGestionaleNumericDraft({
  value,
  preset,
  onCommit,
  readOnly = false,
  allowNegative,
}: UseGestionaleNumericDraftOptions) {
  const committedRef = useRef(value);
  const [draft, setDraft] = useState(() => formatCommittedValue(value, preset.precision));
  const [isFocused, setIsFocused] = useState(false);
  const allowNeg = allowNegative ?? (preset.min !== undefined && preset.min < 0);

  useEffect(() => {
    committedRef.current = value;
    if (!isFocused) {
      setDraft(formatCommittedValue(value, preset.precision));
    }
  }, [value, preset.precision, isFocused]);

  const runCommit = useCallback(() => {
    const result = commitNumericDraft(draft, preset, committedRef.current);
    const next = resolveCommittedNumber(result, committedRef.current);
    committedRef.current = next;
    setDraft(formatCommittedValue(next, preset.precision));
    onCommit(next);
  }, [draft, onCommit, preset]);

  const onChange = useCallback(
    (next: string) => {
      if (!isDecimalInputDraft(next, { allowNegative: allowNeg })) return;
      setDraft(next);
    },
    [allowNeg],
  );

  const onFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  }, []);

  const onBlur = useCallback(() => {
    setIsFocused(false);
    runCommit();
  }, [runCommit]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  return {
    draft,
    readOnly,
    inputMode: preset.inputMode,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    isFocused,
    /** @internal test hook — commit senza blur */
    runCommit,
  };
}

/** Pure: simula sequenza digitazione senza parent update fino al commit finale. */
export function simulateNumericDraftCommit(
  keystrokes: string[],
  preset: NumericInputPreset,
  initialCommitted: number,
): number {
  let draft = formatCommittedValue(initialCommitted, preset.precision);
  let committed = initialCommitted;
  for (const key of keystrokes) {
    if (key === "__blur__") {
      const result = commitNumericDraft(draft, preset, committed);
      committed = resolveCommittedNumber(result, committed);
      draft = formatCommittedValue(committed, preset.precision);
    } else if (isDecimalInputDraft(key)) {
      draft = key;
    }
  }
  const result = commitNumericDraft(draft, preset, committed);
  return resolveCommittedNumber(result, committed);
}
