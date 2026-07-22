"use client";

import { useCallback, useMemo, useState } from "react";
import {
  GestionaleConfirmDialog,
  gestionaleConfirmActionsClass,
} from "@/components/gestionale/gestionale-confirm-dialog";
import type { ConflictSummary } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import { dsBtnNeutral, dsBtnPrimary, dsBtnSoftOrange } from "@/lib/ui/design-system";

export function SchedaSaveConflictDialog({
  open,
  summary,
  selectedFields,
  selectedMeteringKm,
  selectedMeteringOre,
  onToggleField,
  onToggleMeteringKm,
  onToggleMeteringOre,
  onSaveInterventoOnly,
  onConfirmUpdate,
  onCorrect,
}: {
  open: boolean;
  summary: ConflictSummary | null;
  selectedFields: Set<MezzoPermanentFieldKey>;
  selectedMeteringKm: boolean;
  selectedMeteringOre: boolean;
  onToggleField: (field: MezzoPermanentFieldKey) => void;
  onToggleMeteringKm: () => void;
  onToggleMeteringOre: () => void;
  onSaveInterventoOnly: () => void;
  onConfirmUpdate: () => void;
  onCorrect: () => void;
}) {
  if (!summary) return null;

  const hasKmWarning = summary.meteringWarnings.some((w) => w.tipo === "km");
  const hasOreWarning = summary.meteringWarnings.some((w) => w.tipo === "ore");

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Modifiche sul mezzo"
      onCancel={onCorrect}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <button type="button" className={dsBtnNeutral} onClick={onCorrect}>
            Correggi dati
          </button>
          <button type="button" className={dsBtnSoftOrange} onClick={onSaveInterventoOnly}>
            Salva solo intervento
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onConfirmUpdate}>
            Conferma aggiornamento
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Sono state rilevate differenze rispetto all&apos;anagrafica mezzo collegata.
      </p>
      {summary.mezzoStale ? (
        <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          Il mezzo è stato modificato da un altro utente dopo il collegamento.
        </p>
      ) : null}
      {summary.anagraficaChanges.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Anagrafica</p>
          {summary.anagraficaChanges.map((row) => (
            <label key={row.field} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedFields.has(row.field)}
                onChange={() => onToggleField(row.field)}
              />
              <span>
                <span className="font-medium">{row.label}</span>
                <span className="block text-xs text-zinc-500">
                  {row.prima} → {row.dopo}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      {(hasKmWarning || hasOreWarning) && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Valori chilometrici
          </p>
          {hasKmWarning ? (
            <label className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <input type="checkbox" checked={selectedMeteringKm} onChange={onToggleMeteringKm} />
              Km inferiori allo storico
            </label>
          ) : null}
          {hasOreWarning ? (
            <label className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <input type="checkbox" checked={selectedMeteringOre} onChange={onToggleMeteringOre} />
              Ore inferiori allo storico
            </label>
          ) : null}
        </div>
      )}
    </GestionaleConfirmDialog>
  );
}

export function useSchedaSaveConflictSelection(summary: ConflictSummary | null) {
  const [selectedFields, setSelectedFields] = useState<Set<MezzoPermanentFieldKey>>(() => new Set());
  const [selectedMeteringKm, setSelectedMeteringKm] = useState(false);
  const [selectedMeteringOre, setSelectedMeteringOre] = useState(false);

  const initFromSummary = useCallback((s: ConflictSummary) => {
    setSelectedFields(new Set(s.anagraficaChanges.map((c) => c.field)));
    setSelectedMeteringKm(s.meteringWarnings.some((w) => w.tipo === "km" && w.severity === "lower"));
    setSelectedMeteringOre(s.meteringWarnings.some((w) => w.tipo === "ore" && w.severity === "lower"));
  }, []);

  const buildPlan = useCallback((): MezzoUpdateFromSchedaPlan => {
    const meteringFields: ("km" | "oreLavoro")[] = [];
    if (selectedMeteringKm) meteringFields.push("km");
    if (selectedMeteringOre) meteringFields.push("oreLavoro");
    return {
      updateAnagrafica: selectedFields.size > 0,
      fieldsToUpdate: [...selectedFields],
      updateMetering: meteringFields.length > 0,
      meteringFields,
      forceDespiteStale: summary?.mezzoStale ?? false,
    };
  }, [selectedFields, selectedMeteringKm, selectedMeteringOre, summary?.mezzoStale]);

  const toggleField = useCallback((field: MezzoPermanentFieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      selectedFields,
      selectedMeteringKm,
      selectedMeteringOre,
      initFromSummary,
      buildPlan,
      toggleField,
      toggleMeteringKm: () => setSelectedMeteringKm((v) => !v),
      toggleMeteringOre: () => setSelectedMeteringOre((v) => !v),
    }),
    [
      buildPlan,
      initFromSummary,
      selectedFields,
      selectedMeteringKm,
      selectedMeteringOre,
      toggleField,
    ],
  );
}
