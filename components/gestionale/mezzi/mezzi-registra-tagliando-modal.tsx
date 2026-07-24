"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  MAINTENANCE_EXECUTION_TYPES,
  MAINTENANCE_EXECUTION_TYPE_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceExecutionType } from "@/lib/maintenance-plans/maintenance-enums";
import { isPartDue } from "@/lib/maintenance-plans/part-replacement-condition";
import { REPLACEMENT_CONDITION_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import { suggestPartReplacedAtRegistration } from "@/lib/maintenance-plans/suggest-part-replaced";
import { buildPresetSnapshot } from "@/lib/maintenance-plans/preset-snapshot";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel } from "@/lib/ui/design-system";
import { useRegisterMaintenanceServiceMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import {
  useEffectivePresetForConfigQuery,
  useRegisterExecutionV2Mutation,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import {
  useMaintenancePlansListQuery,
  useMaintenanceRicambiSearchQuery,
  useMezzoMaintenanceHistoryQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  triggersNeedKm,
  triggersNeedOre,
} from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type ExtraPart = { ricambioId: string; descrizione: string; quantita: number };

export function MezziRegistraTagliandoModal({
  open,
  mezzoId,
  tipoAttrezzatura,
  currentOreMezzo,
  currentKmMezzo,
  defaultPlanId,
  configId,
  configIntervalType,
  planTriggers,
  onClose,
  onSaved,
}: {
  open: boolean;
  mezzoId: string;
  tipoAttrezzatura: string;
  currentOreMezzo: number;
  currentKmMezzo?: number | null;
  defaultPlanId?: string;
  configId?: string;
  configIntervalType?: "ore" | "km" | "giorni" | "mesi";
  planTriggers?: MaintenancePresetTriggerView[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { validation: toastValidation, error: toastError, successSaved } = useGestionaleToast();
  const plansQ = useMaintenancePlansListQuery(open);
  const historyQ = useMezzoMaintenanceHistoryQuery(mezzoId, open);
  const registerMut = useRegisterMaintenanceServiceMutation();
  const registerV2Mut = useRegisterExecutionV2Mutation();
  const effectivePresetQ = useEffectivePresetForConfigQuery(configId, open && Boolean(configId));

  const applicablePlans = useMemo(() => {
    if (!plansQ.data) return [] as MaintenancePlanView[];
    const active = plansQ.data.filter((p) => p.status === "active");
    if (defaultPlanId) {
      const picked = active.find((p) => p.id === defaultPlanId);
      return picked ? [picked] : active;
    }
    return active;
  }, [plansQ.data, defaultPlanId]);

  const [planId, setPlanId] = useState(defaultPlanId ?? "");
  const [performedAt, setPerformedAt] = useState(todayIsoDate());
  const [oreAtService, setOreAtService] = useState(String(currentOreMezzo || 0));
  const [kmAtService, setKmAtService] = useState(String(currentKmMezzo ?? 0));
  const [executionType, setExecutionType] = useState<MaintenanceExecutionType>("scheduled");
  const [note, setNote] = useState("");
  const [selectedParts, setSelectedParts] = useState<Record<string, boolean>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [extraParts, setExtraParts] = useState<ExtraPart[]>([]);
  const [ricSearch, setRicSearch] = useState("");
  const ricambiQ = useMaintenanceRicambiSearchQuery(ricSearch, open && ricSearch.trim().length >= 2);

  const selectedPlan = applicablePlans.find((p) => p.id === planId) ?? applicablePlans[0] ?? null;
  const effectivePreset = effectivePresetQ.data;
  const effectiveParts = effectivePreset?.parts ?? [];
  const checklistItems = selectedPlan?.checklist ?? [];

  const executionCount = useMemo(() => {
    const pid = effectivePreset?.presetId ?? selectedPlan?.id;
    if (!pid || !historyQ.data) return 1;
    return historyQ.data.filter((h) => h.planId === pid).length + 1;
  }, [historyQ.data, effectivePreset?.presetId, selectedPlan?.id]);

  const partsForUi = useMemo(() => {
    const base =
      configId && effectiveParts.length > 0
        ? effectiveParts.map((p) => ({
            ricambioId: p.ricambioId,
            descrizione: p.descrizione,
            quantita: p.quantita,
            replacementCondition: p.replacementCondition,
            conditionParams: p.conditionParams,
            isRequired: p.isRequired,
          }))
        : (selectedPlan?.parts ?? []).map((p) => ({
            ricambioId: p.ricambioId,
            descrizione: p.descrizione,
            quantita: p.quantita,
            replacementCondition: p.replacementCondition,
            conditionParams: p.conditionParams,
            isRequired: p.isRequired,
          }));
    const extras = extraParts.map((p) => ({
      ricambioId: p.ricambioId,
      descrizione: p.descrizione,
      quantita: p.quantita,
      replacementCondition: "sempre" as const,
      conditionParams: null,
      isRequired: false,
    }));
    return [...base, ...extras];
  }, [configId, effectiveParts, selectedPlan?.parts, extraParts]);

  useEffect(() => {
    if (!open) return;
    const pid = defaultPlanId ?? applicablePlans[0]?.id ?? "";
    setPlanId(pid);
    setPerformedAt(todayIsoDate());
    setOreAtService(String(currentOreMezzo || 0));
    setKmAtService(String(currentKmMezzo ?? 0));
    setExecutionType("scheduled");
    setNote("");
    setExtraParts([]);
    setRicSearch("");
    const plan = applicablePlans.find((p) => p.id === pid) ?? applicablePlans[0];
    const checklist: Record<string, boolean> = {};
    for (const item of plan?.checklist ?? []) checklist[item.label] = false;
    setChecklistState(checklist);
  }, [open, defaultPlanId, applicablePlans, currentOreMezzo, currentKmMezzo]);

  useEffect(() => {
    if (!open || partsForUi.length === 0) return;
    setSelectedParts(() => {
      const next: Record<string, boolean> = {};
      for (const part of partsForUi) {
        next[part.ricambioId] = suggestPartReplacedAtRegistration({
          replacementCondition: part.replacementCondition,
          conditionParams: part.conditionParams,
          isRequired: part.isRequired,
          executionCount,
        });
      }
      return next;
    });
  }, [open, partsForUi, executionCount]);

  const oreMismatch =
    Number(oreAtService) !== currentOreMezzo && Number.isFinite(Number(oreAtService));
  const meterTriggers = planTriggers ?? (selectedPlan?.triggerGroups[0]?.triggers ?? []);
  const showKm = triggersNeedKm(meterTriggers) || configIntervalType === "km";
  const showOre = triggersNeedOre(meterTriggers);
  const submitBlocked =
    configId && (effectivePresetQ.isLoading || (effectivePresetQ.isError && !effectivePresetQ.data));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan) {
      toastValidation("Seleziona un piano tagliando valido.");
      return;
    }
    const ore = Number(oreAtService);
    if (showOre && (!Number.isFinite(ore) || ore < 0)) {
      toastValidation("Inserisci ore esecuzione valide.");
      return;
    }
    const km = Number(kmAtService);
    if (showKm && (!Number.isFinite(km) || km < 0)) {
      toastValidation("Inserisci km esecuzione validi.");
      return;
    }
    if (submitBlocked) {
      toastValidation("Caricamento preset in corso. Attendi qualche secondo.");
      return;
    }

    const presetForSnapshot = effectivePreset ?? {
      presetId: selectedPlan.id,
      nome: selectedPlan.nome,
      intervalType: selectedPlan.intervalType,
      intervalValue: selectedPlan.intervalValue,
      parts: selectedPlan.parts.map((p) => ({
        ricambioId: p.ricambioId,
        codice: p.codice,
        descrizione: p.descrizione,
        quantita: p.quantita,
        isRequired: p.isRequired,
        replacementCondition: p.replacementCondition,
        conditionParams: p.conditionParams,
        sortOrder: p.sortOrder,
        note: p.note,
      })),
    };

    const snapshot = buildPresetSnapshot({
      preset: presetForSnapshot,
      checklist: checklistItems.map((c) => ({ label: c.label, isRequired: c.isRequired })),
      partsOverride: partsForUi
        .filter((p) => selectedParts[p.ricambioId])
        .map((p) => ({
          ricambioId: p.ricambioId,
          codice: "—",
          descrizione: p.descrizione,
          quantita: p.quantita,
          isRequired: p.isRequired,
          replacementCondition: p.replacementCondition,
          conditionParams: p.conditionParams,
          sortOrder: 0,
          note: "",
        })),
    });

    const checklistPayload = checklistItems.map((item, idx) => ({
      itemLabel: item.label,
      checked: checklistState[item.label] ?? false,
      sortOrder: item.sortOrder ?? idx,
    }));

    try {
      if (configId) {
        const planIdForSave = effectivePreset?.presetId ?? selectedPlan.id;
        await registerV2Mut.mutateAsync({
          configId,
          mezzoId,
          planId: planIdForSave,
          performedAt,
          oreAtService: showOre ? ore : 0,
          kmAtService: showKm ? km : null,
          mezzoOreSnapshot: currentOreMezzo,
          note,
          executionType,
          presetSnapshot: snapshot,
          checklist: checklistPayload,
          parts: partsForUi.map((p) => ({
            ricambioId: p.ricambioId,
            quantita: p.quantita,
            descrizioneSnapshot: p.descrizione,
            wasReplaced: selectedParts[p.ricambioId] ?? false,
            wasDue: isPartDue({
              condition: p.replacementCondition,
              conditionParams: p.conditionParams,
              executionCount,
              oreSinceLastReplace: null,
              kmSinceLastReplace: null,
            }),
            replacementCondition: p.replacementCondition,
            isRequired: p.isRequired,
          })),
        });
      } else {
        await registerMut.mutateAsync({
          mezzoId,
          planId: selectedPlan.id,
          performedAt,
          oreAtService: showOre ? ore : 0,
          kmAtService: showKm ? km : null,
          mezzoOreSnapshot: currentOreMezzo,
          note,
          executionType,
          presetSnapshot: snapshot,
          checklist: checklistPayload,
          parts: partsForUi.map((p) => ({
            ricambioId: p.ricambioId,
            quantita: p.quantita,
            descrizioneSnapshot: p.descrizione,
            wasReplaced: selectedParts[p.ricambioId] ?? false,
            wasDue: isPartDue({
              condition: p.replacementCondition,
              conditionParams: p.conditionParams,
              executionCount,
              oreSinceLastReplace: null,
              kmSinceLastReplace: null,
            }),
            replacementCondition: p.replacementCondition,
            isRequired: p.isRequired,
          })),
        });
      }
      successSaved();
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, { entity: "mezzo", action: "create" });
    }
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title="Registra tagliando"
      titleId="registra-tagliando-title"
      modalSize="formMedium"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form="registra-tagliando-form"
            className={dsBtnPrimary}
            loading={registerMut.isPending || registerV2Mut.isPending}
            disabled={Boolean(submitBlocked)}
          >
            Salva
          </LoadingButton>
        </div>
      }
    >
      <GestionaleModalScrollBody>
        {applicablePlans.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Nessun piano applicabile per questo tipo attrezzatura. Verifica il catalogo in Impostazioni.
          </p>
        ) : (
          <form id="registra-tagliando-form" className="space-y-4" onSubmit={onSubmit}>
            {submitBlocked ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">Caricamento configurazione preset…</p>
            ) : null}
            {applicablePlans.length > 1 ? (
              <div className={dsFormField}>
                <label className={dsFormLabel} htmlFor="rt-plan">
                  Piano
                </label>
                <select
                  id="rt-plan"
                  className={dsFormInput}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  {applicablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-exec-type">
                Tipo esecuzione
              </label>
              <select
                id="rt-exec-type"
                className={dsFormInput}
                value={executionType}
                onChange={(e) => setExecutionType(e.target.value as MaintenanceExecutionType)}
                required
              >
                {MAINTENANCE_EXECUTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MAINTENANCE_EXECUTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-data">
                Data esecuzione
              </label>
              <input
                id="rt-data"
                type="date"
                className={dsFormInput}
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                required
              />
              {meterTriggers.some((t) => t.triggerType === "mesi" || t.triggerType === "giorni") ? (
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                  Obbligatoria per intervalli a calendario (mesi/giorni).
                </p>
              ) : null}
            </div>
            {showOre ? (
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-ore">
                Ore veicolo
              </label>
              <input
                id="rt-ore"
                type="number"
                min={0}
                step={1}
                className={dsFormInput}
                value={oreAtService}
                onChange={(e) => setOreAtService(e.target.value)}
                required={showOre}
              />
              {oreMismatch ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                  Le ore inserite differiscono dalle ore anagrafica mezzo ({currentOreMezzo} h).
                </p>
              ) : null}
            </div>
            ) : null}
            {showKm ? (
              <div className={dsFormField}>
                <label className={dsFormLabel} htmlFor="rt-km">
                  Km veicolo
                </label>
                <input
                  id="rt-km"
                  type="number"
                  min={0}
                  step={1}
                  className={dsFormInput}
                  value={kmAtService}
                  onChange={(e) => setKmAtService(e.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-note">
                Note
              </label>
              <GestionaleTextarea id="rt-note" className={dsFormInput} rows={3} value={note} onChange={setNote} />
            </div>
            {checklistItems.length > 0 ? (
              <div className={dsFormField}>
                <span className={dsFormLabel}>Checklist</span>
                <ul className="space-y-2">
                  {checklistItems.map((item) => (
                    <li key={item.label}>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checklistState[item.label] ?? false}
                          onChange={(e) =>
                            setChecklistState((prev) => ({ ...prev, [item.label]: e.target.checked }))
                          }
                        />
                        {item.label}
                        {item.isRequired ? " *" : ""}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {partsForUi.length > 0 ? (
              <div className={dsFormField}>
                <span className={dsFormLabel}>Ricambi — cosa hai sostituito?</span>
                <p className="mb-2 text-xs text-[color:var(--cab-text-muted)]">
                  Dal preset: spunta solo i componenti effettivamente montati. I suggeriti sono preselezionati in base alla regola del piano.
                </p>
                <ul className="space-y-2 rounded-lg border border-[color:var(--cab-border)] p-2">
                  {partsForUi.map((p) => (
                    <li key={p.ricambioId}>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedParts[p.ricambioId] ?? false}
                          onChange={(e) =>
                            setSelectedParts((prev) => ({ ...prev, [p.ricambioId]: e.target.checked }))
                          }
                        />
                        <span>
                          <span className="font-medium">{p.descrizione}</span>
                          <span className="text-[color:var(--cab-text-muted)]"> × {p.quantita}</span>
                          {p.isRequired ? <span className="text-amber-700 dark:text-amber-300"> *</span> : null}
                          <span className="mt-0.5 block text-xs text-[color:var(--cab-text-muted)]">
                            {REPLACEMENT_CONDITION_LABELS[p.replacementCondition]}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--cab-text-muted)]">
                Nessun ricambio nel preset. Aggiungine uno sotto o configura il piano in Impostazioni.
              </p>
            )}
            <div className={dsFormField}>
              <span className={dsFormLabel}>Aggiungi ricambio extra</span>
              <input
                className={dsFormInput}
                placeholder="Cerca ricambio…"
                value={ricSearch}
                onChange={(e) => setRicSearch(e.target.value)}
              />
              {(ricambiQ.data ?? []).length > 0 ? (
                <ul className="mt-2 max-h-28 overflow-y-auto rounded border border-[color:var(--cab-border)] text-sm">
                  {(ricambiQ.data ?? []).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-1.5 text-left hover:bg-[var(--cab-hover)]"
                        onClick={() => {
                          if (extraParts.some((p) => p.ricambioId === r.id)) return;
                          setExtraParts((prev) => [
                            ...prev,
                            { ricambioId: r.id, descrizione: r.nome, quantita: 1 },
                          ]);
                          setSelectedParts((prev) => ({ ...prev, [r.id]: true }));
                          setRicSearch("");
                        }}
                      >
                        {r.codice} — {r.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </form>
        )}
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
