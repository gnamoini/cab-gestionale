"use client";

import { useEffect, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import type { EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";

export type AmbiguityPick = {
  fieldKey: string;
  label: string;
  id: string | null;
  original: string;
};

export function CaptureEntityAmbiguityDialog({
  open,
  items,
  onCancel,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  items: readonly { fieldKey: string; original: string; resolution: EntityResolutionResult }[];
  onCancel: () => void;
  onConfirm: (picks: AmbiguityPick[]) => void;
  pending?: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const item of items) {
      next[item.fieldKey] = item.resolution.candidateList[0]?.label ?? "";
    }
    setSelected(next);
  }, [open, items]);

  if (!open || items.length === 0) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Conferma corrispondenze ambigue"
      subtitle="Confidence insufficiente — seleziona la voce corretta dal gestionale."
      confirmLabel="Conferma e prosegui"
      cancelLabel="Annulla"
      pending={pending}
      confirmDisabled={items.some((item) => !selected[item.fieldKey]?.trim())}
      onCancel={onCancel}
      onConfirm={() => {
        onConfirm(
          items.map((item) => {
            const label = selected[item.fieldKey] ?? "";
            const candidate = item.resolution.candidateList.find((c) => c.label === label);
            return {
              fieldKey: item.fieldKey,
              label,
              id: candidate?.id ?? null,
              original: item.original,
            };
          }),
        );
      }}
      layerClassName="z-[130]"
    >
      <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1 text-sm">
        {items.map((item) => (
          <li key={item.fieldKey} className="rounded border border-[color:var(--cab-border)] p-2">
            <p className="font-medium capitalize">{item.fieldKey.replace(/_/g, " ")}</p>
            <p className="text-xs text-[color:var(--cab-muted-fg)]">
              Documento: <span className="font-medium text-[color:var(--cab-fg)]">{item.original}</span>
            </p>
            <fieldset className="mt-2 space-y-1">
              <legend className="sr-only">Seleziona corrispondenza</legend>
              {item.resolution.candidateList.map((c) => (
                <label key={c.label} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name={`ambiguity-${item.fieldKey}`}
                    checked={selected[item.fieldKey] === c.label}
                    onChange={() => setSelected((cur) => ({ ...cur, [item.fieldKey]: c.label }))}
                  />
                  <span>
                    {c.label} <span className="text-[color:var(--cab-muted-fg)]">({Math.round(c.score * 100)}%)</span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name={`ambiguity-${item.fieldKey}`}
                  checked={selected[item.fieldKey] === "__keep__"}
                  onChange={() => setSelected((cur) => ({ ...cur, [item.fieldKey]: "__keep__" }))}
                />
                <span>Mantieni originale ({item.original})</span>
              </label>
            </fieldset>
          </li>
        ))}
      </ul>
    </GestionaleConfirmDialog>
  );
}
