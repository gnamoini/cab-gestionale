"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  mergePresetRigheWithUserModified,
  presetPartsToSchedaRighe,
} from "@/lib/maintenance-plans/apply-preset-to-scheda-ricambi";
import { partsToMaintenanceTasks } from "@/lib/maintenance-plans/preset-to-tasks";
import type { EffectivePreset } from "@/lib/maintenance-plans/resolve-effective-preset";
import type { RigaRicambioScheda } from "@/types/schede";
import { useTagliandoPresetSync } from "@/src/hooks/use-tagliando-preset-sync";

export function useLavorazioneTagliandoRicambiAutofill({
  enabled,
  isTagliando,
  preset,
  presetVersionRef,
  righe,
  onApplyRighe,
}: {
  enabled: boolean;
  isTagliando: boolean;
  preset: EffectivePreset | null | undefined;
  presetVersionRef: string | null | undefined;
  righe: RigaRicambioScheda[];
  onApplyRighe: (next: RigaRicambioScheda[]) => void;
}) {
  const userModifiedRef = useRef<Set<string>>(new Set());
  const autofillDoneRef = useRef(false);

  const tasks = useMemo(
    () => (preset ? partsToMaintenanceTasks(preset.parts) : []),
    [preset],
  );

  const { promptOpen, acceptResync, keepCurrent, checkForPresetChange } = useTagliandoPresetSync({
    enabled: enabled && isTagliando && Boolean(preset),
    currentVersionRef: presetVersionRef,
    currentTasks: tasks,
    onResync: () => {
      if (!preset) return;
      const incoming = presetPartsToSchedaRighe(preset.parts);
      onApplyRighe(mergePresetRigheWithUserModified(incoming, righe, userModifiedRef.current));
    },
  });

  const applyAutofill = useCallback(() => {
    if (!preset || preset.parts.length === 0) return;
    const incoming = presetPartsToSchedaRighe(preset.parts);
    onApplyRighe(mergePresetRigheWithUserModified(incoming, righe, userModifiedRef.current));
  }, [onApplyRighe, preset, righe]);

  useEffect(() => {
    if (!enabled || !isTagliando || !preset || autofillDoneRef.current) return;
    if (righe.length > 0) return;
    autofillDoneRef.current = true;
    applyAutofill();
  }, [applyAutofill, enabled, isTagliando, preset, righe.length]);

  useEffect(() => {
    if (!enabled || !isTagliando || !preset) return;
    checkForPresetChange(presetVersionRef, tasks);
  }, [checkForPresetChange, enabled, isTagliando, preset, presetVersionRef, tasks]);

  const markUserModified = useCallback((rowId: string) => {
    userModifiedRef.current.add(rowId);
  }, []);

  return { promptOpen, acceptResync, keepCurrent, markUserModified, applyAutofill };
}
