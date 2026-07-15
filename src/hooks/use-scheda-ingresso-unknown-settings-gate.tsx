"use client";

import { useCallback, useRef, useState } from "react";
import { SchedaIngressoUnknownSettingsDialog } from "@/components/gestionale/lavorazioni/scheda-ingresso-unknown-settings-dialog";
import {
  applyCanonicalValuesToSchedaIngresso,
  listSchedaIngressoUnknownSettings,
  type SchedaIngressoUnknownSettingItem,
} from "@/lib/schede/scheda-ingresso-unknown-settings";
import { useAppendSchedaIngressoUnknownSettings } from "@/src/hooks/use-append-scheda-ingresso-unknown-settings";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

type PendingAction = {
  fields: SchedaIngressoFields;
  proceed: (fields: SchedaIngressoFields) => void | Promise<void>;
  finish: () => void;
};

export function useSchedaIngressoUnknownSettingsGate(globalOpts?: GlobalOptionsSlice) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SchedaIngressoUnknownSettingItem[]>([]);
  const [gatePending, setGatePending] = useState(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const { appendItems, canManageSettings, isPending: appendPending } = useAppendSchedaIngressoUnknownSettings();

  const closeGate = useCallback(() => {
    pendingRef.current?.finish();
    setOpen(false);
    setItems([]);
    pendingRef.current = null;
    setGatePending(false);
  }, []);

  const runProceed = useCallback(async (fields: SchedaIngressoFields) => {
    const pending = pendingRef.current;
    if (!pending) return;
    setGatePending(true);
    try {
      await pending.proceed(fields);
    } finally {
      setGatePending(false);
      setOpen(false);
      setItems([]);
      pendingRef.current = null;
    }
  }, []);

  const gateSubmit = useCallback(
    async (fields: SchedaIngressoFields, proceed: (fields: SchedaIngressoFields) => void | Promise<void>) => {
      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        const wrappedProceed = async (nextFields: SchedaIngressoFields) => {
          try {
            await proceed(nextFields);
          } finally {
            finish();
          }
        };

        if (!globalOpts || globalOpts.isLoading) {
          void wrappedProceed(fields);
          return;
        }

        const unknown = listSchedaIngressoUnknownSettings(fields, globalOpts);
        if (unknown.length === 0) {
          void wrappedProceed(fields);
          return;
        }

        pendingRef.current = { fields, proceed: wrappedProceed, finish };
        setItems(unknown);
        setOpen(true);
      });
    },
    [globalOpts],
  );

  const onContinueWithoutSave = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    void runProceed(pending.fields);
  }, [runProceed]);

  const onSaveAndContinue = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    void (async () => {
      setGatePending(true);
      try {
        const canonical = await appendItems(items);
        if (canonical === null) return;
        const nextFields = applyCanonicalValuesToSchedaIngresso(pending.fields, canonical);
        await runProceed(nextFields);
      } finally {
        setGatePending(false);
      }
    })();
  }, [appendItems, items, runProceed]);

  const dialog = (
    <SchedaIngressoUnknownSettingsDialog
      open={open}
      items={items}
      pending={gatePending || appendPending}
      canSaveSettings={canManageSettings}
      onCancel={closeGate}
      onSaveAndContinue={onSaveAndContinue}
      onContinueWithoutSave={onContinueWithoutSave}
    />
  );

  return { gateSubmit, dialog, gateOpen: open };
}
