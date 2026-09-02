"use client";

import { useCallback, useRef, useState } from "react";
import { SchedaIngressoUnknownSettingsDialog } from "@/components/gestionale/lavorazioni/scheda-ingresso-unknown-settings-dialog";
import {
  listSchedaIngressoUnknownSettings,
  type SchedaIngressoUnknownSettingItem,
} from "@/lib/schede/scheda-ingresso-unknown-settings";
import {
  runUnknownSettingsGateSubmit,
  runUnknownSettingsSaveAndContinue,
  type UnknownSettingsGatePending,
} from "@/lib/schede/scheda-ingresso-unknown-settings-gate-core";
import { useAppendSchedaIngressoUnknownSettings } from "@/src/hooks/use-append-scheda-ingresso-unknown-settings";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

export function useSchedaIngressoUnknownSettingsGate(globalOpts?: GlobalOptionsSlice) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SchedaIngressoUnknownSettingItem[]>([]);
  const [gatePending, setGatePending] = useState(false);
  const pendingRef = useRef<UnknownSettingsGatePending | null>(null);
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
      const unknown =
        !globalOpts || globalOpts.isLoading
          ? []
          : listSchedaIngressoUnknownSettings(fields, globalOpts);

      await runUnknownSettingsGateSubmit(
        fields,
        proceed,
        {
          globalOptsLoading: !globalOpts || globalOpts.isLoading,
          unknown,
        },
        (pending) => {
          pendingRef.current = pending;
          setItems(unknown);
          setOpen(true);
        },
      );
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
        await runUnknownSettingsSaveAndContinue(pending, () => appendItems(items));
      } catch {
        /* finish() già invocato in core su appendItems null */
      } finally {
        setGatePending(false);
      }
    })();
  }, [appendItems, items]);

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
