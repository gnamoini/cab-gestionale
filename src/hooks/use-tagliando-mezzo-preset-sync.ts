"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import type { VehicleMaintenanceConfigView } from "@/lib/maintenance-plans/v2-types";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function useTagliandoMezzoPresetSync({
  enabled,
  isTagliando,
  mezzoId,
  configs,
  configsReady,
  presetPlans,
  onTagliandoFieldsChange,
  notifyOnInitialMezzoLink = false,
}: {
  enabled: boolean;
  isTagliando: boolean;
  mezzoId: string;
  configs: VehicleMaintenanceConfigView[] | undefined;
  configsReady: boolean;
  presetPlans: MaintenancePlanView[];
  onTagliandoFieldsChange: (patch: Partial<TagliandoLavorazioneFields>) => void;
  /** Creazione lavorazione: avvisa al primo collegamento mezzo. */
  notifyOnInitialMezzoLink?: boolean;
}) {
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const prevMezzoRef = useRef<string | undefined>(undefined);
  const prevIsTagliandoRef = useRef(false);
  const lastAppliedPresetKeyRef = useRef<string | null>(null);

  const primaryConfig = configs?.[0] ?? null;
  const mezzoHasConfig = (configs?.length ?? 0) > 0;
  const mezzoPresetNome =
    primaryConfig?.presetNome?.trim() ||
    presetPlans.find((p) => p.id === primaryConfig?.presetId)?.nome ||
    null;

  useEffect(() => {
    if (!enabled || !mezzoId) {
      if (!mezzoId) {
        prevMezzoRef.current = undefined;
        lastAppliedPresetKeyRef.current = null;
      }
      prevIsTagliandoRef.current = isTagliando;
      return;
    }

    const tagliandoJustEnabled = isTagliando && !prevIsTagliandoRef.current;
    prevIsTagliandoRef.current = isTagliando;

    if (!isTagliando) return;
    if (!configsReady) return;

    const isInitialSync = prevMezzoRef.current === undefined;
    const mezzoChanged = !isInitialSync && prevMezzoRef.current !== mezzoId;
    const notify =
      mezzoChanged ||
      tagliandoJustEnabled ||
      (isInitialSync && notifyOnInitialMezzoLink && Boolean(mezzoId));
    prevMezzoRef.current = mezzoId;

    if (primaryConfig?.presetId) {
      const presetKey = `${mezzoId}:${primaryConfig.presetId}`;
      if (!notify && lastAppliedPresetKeyRef.current === presetKey) return;
      lastAppliedPresetKeyRef.current = presetKey;

      const nome =
        primaryConfig.presetNome?.trim() ||
        presetPlans.find((p) => p.id === primaryConfig.presetId)?.nome ||
        "preset";
      onTagliandoFieldsChange({
        tagliandoPresetRef: primaryConfig.presetId,
        tagliandoPresetVersionRef: primaryConfig.presetVersionId ?? null,
        tagliandoAssignPresetToMezzo: null,
      });
      if (notify) {
        gestToast.info(
          `Il mezzo ha già il preset «${nome}» configurato — preimpostato su questa lavorazione.`,
        );
      }
      return;
    }

    lastAppliedPresetKeyRef.current = null;

    if (mezzoChanged || tagliandoJustEnabled || (isInitialSync && notifyOnInitialMezzoLink)) {
      if (mezzoChanged || (isInitialSync && notifyOnInitialMezzoLink)) {
        onTagliandoFieldsChange({
          tagliandoPresetRef: null,
          tagliandoPresetVersionRef: null,
          tagliandoAssignPresetToMezzo: null,
        });
      }
      if (notify) {
        gestToast.info("Il mezzo non ha alcun preset manutenzione configurato.");
      }
    }
  }, [
    enabled,
    isTagliando,
    mezzoId,
    configsReady,
    primaryConfig,
    presetPlans,
    onTagliandoFieldsChange,
    gestToast,
    notifyOnInitialMezzoLink,
  ]);

  const handlePresetRefChange = useCallback(
    async (presetId: string | null) => {
      if (!presetId) {
        onTagliandoFieldsChange({
          tagliandoPresetRef: null,
          tagliandoPresetVersionRef: null,
          tagliandoAssignPresetToMezzo: null,
        });
        return;
      }

      const presetNome = presetPlans.find((p) => p.id === presetId)?.nome ?? "preset";
      let assignToMezzo = false;
      if (!mezzoHasConfig && mezzoId) {
        assignToMezzo = await confirm({
          title: "Assegnare preset al mezzo?",
          message: `Il mezzo non ha preset configurato. Vuoi assegnare «${presetNome}» anche nella scheda tagliandi del mezzo al salvataggio?`,
          confirmLabel: "Sì, assegna al mezzo",
          cancelLabel: "Solo questa lavorazione",
        });
      }

      onTagliandoFieldsChange({
        tagliandoPresetRef: presetId,
        tagliandoPresetVersionRef: null,
        tagliandoAssignPresetToMezzo: assignToMezzo ? true : null,
      });
    },
    [confirm, mezzoHasConfig, mezzoId, onTagliandoFieldsChange, presetPlans],
  );

  return {
    mezzoHasConfig,
    mezzoPresetNome,
    presetLocked: false,
    handlePresetRefChange,
    confirmDialog,
  };
}
