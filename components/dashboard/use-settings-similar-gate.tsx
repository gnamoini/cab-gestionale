"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  findSimilarSettingsDuplicate,
  isBlockingExactDuplicate,
  settingsNormKey,
} from "@/lib/settings/settings-list-duplicate";

const SettingsSimileConfirmDialog = dynamic(() =>
  import("@/components/dashboard/settings-simile-confirm-dialog").then((m) => ({
    default: m.SettingsSimileConfirmDialog,
  })),
);

type SimilarPending =
  | { mode: "add"; candidate: string; similarTo: string; onConfirm: () => void; onAbort?: () => void }
  | { mode: "rename"; from: string; candidate: string; similarTo: string; onConfirm: () => void; onAbort?: () => void }
  | null;

export function useSettingsSimilarGate() {
  const { validation: toastValidation } = useGestionaleToast();
  const [pendingSimilar, setPendingSimilar] = useState<SimilarPending>(null);

  const gate = useCallback((
    values: readonly string[],
    candidate: string,
    exclude: string | undefined,
    onProceed: () => void,
    onAbort?: () => void,
  ) => {
    const t = candidate.trim();
    if (!t) return;
    if (isBlockingExactDuplicate(values, t, exclude)) {
      toastValidation("Elemento già presente (anche con maiuscole diverse).");
      onAbort?.();
      return;
    }
    const similar = findSimilarSettingsDuplicate(values, t, exclude);
    if (similar && settingsNormKey(similar) !== settingsNormKey(t)) {
      setPendingSimilar({
        mode: exclude ? "rename" : "add",
        from: exclude ?? "",
        candidate: t,
        similarTo: similar,
        onConfirm: () => {
          onProceed();
          setPendingSimilar(null);
        },
        onAbort,
      });
      return;
    }
    onProceed();
  }, [toastValidation]);

  const dialog = pendingSimilar ? (
    <SettingsSimileConfirmDialog
      open
      candidate={pendingSimilar.candidate}
      similarTo={pendingSimilar.similarTo}
      onCancel={() => {
        pendingSimilar.onAbort?.();
        setPendingSimilar(null);
      }}
      onConfirm={pendingSimilar.onConfirm}
    />
  ) : null;

  return { gate, similarDialog: dialog };
}
