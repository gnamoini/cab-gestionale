"use client";

import { useCallback, useEffect, useRef } from "react";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import {
  findMezzoMatchForIngressoIdentField,
  type SchedaIngressoIdentField,
  type SchedaIngressoIdentMatchKind,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsInput } from "@/lib/ui/design-system";

const MATCH_DEBOUNCE_MS = 300;

function identPlaceholder(field: SchedaIngressoIdentField): string {
  if (field === "targa") return "Targa";
  if (field === "matricola") return "Matricola";
  if (field === "vin") return "VIN";
  return "N. scuderia";
}

function normalizeIdentInput(field: SchedaIngressoIdentField, raw: string): string {
  return field === "vin" ? raw.trim().toUpperCase() : raw;
}

export function SchedaIngressoIdentTextField({
  field,
  label,
  value,
  mezzi,
  readOnly,
  disabled,
  className = "",
  id: idProp,
  excludeMezzoId,
  dismissedMezzoIds,
  onChange,
  onMezzoMatch,
  onAmbiguousMatch,
}: {
  field: SchedaIngressoIdentField;
  label: string;
  value: string;
  mezzi: readonly MezzoGestito[];
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  excludeMezzoId?: string;
  dismissedMezzoIds?: ReadonlySet<string>;
  onChange: (value: string) => void;
  onMezzoMatch?: (
    mezzo: MezzoGestito,
    field: SchedaIngressoIdentField,
    kind: SchedaIngressoIdentMatchKind,
  ) => void;
  onAmbiguousMatch?: (candidates: readonly MezzoGestito[], field: SchedaIngressoIdentField) => void;
}) {
  const inputId = idProp ?? field;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedValueRef = useRef("");

  const runMatchCheck = useCallback(
    (raw: string) => {
      const v = normalizeIdentInput(field, raw);
      if (v === lastCheckedValueRef.current) return;
      lastCheckedValueRef.current = v;

      const result = findMezzoMatchForIngressoIdentField(mezzi, field, v, { excludeMezzoId });
      if (result.kind === "none") return;
      if (result.kind === "ambiguous") {
        onAmbiguousMatch?.(result.candidates ?? [], field);
        return;
      }
      if (!onMezzoMatch || !result.mezzo) return;
      if (dismissedMezzoIds?.has(result.mezzo.id)) return;
      onMezzoMatch(result.mezzo, field, result.kind);
    },
    [field, mezzi, excludeMezzoId, dismissedMezzoIds, onMezzoMatch, onAmbiguousMatch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    lastCheckedValueRef.current = "";
  }, [value]);

  const scheduleMatchCheck = useCallback(
    (raw: string) => {
      if (!onMezzoMatch && !onAmbiguousMatch) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runMatchCheck(raw), MATCH_DEBOUNCE_MS);
    },
    [onAmbiguousMatch, onMezzoMatch, runMatchCheck],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = normalizeIdentInput(field, e.target.value);
    onChange(next);
    scheduleMatchCheck(next);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runMatchCheck(value);
  };

  const inputClass = `block w-full ${dsInput}`;

  if (readOnly) {
    return (
      <FormField label={label} htmlFor={inputId} className={className}>
        <input id={inputId} className={inputClass} value={value} readOnly disabled />
      </FormField>
    );
  }

  return (
    <FormField label={label} htmlFor={inputId} className={className}>
      <input
        id={inputId}
        type="text"
        className={inputClass}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        autoComplete="off"
        placeholder={identPlaceholder(field)}
      />
    </FormField>
  );
}
