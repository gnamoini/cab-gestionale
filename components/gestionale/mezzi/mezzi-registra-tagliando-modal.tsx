"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel } from "@/lib/ui/design-system";
import { useRegisterMaintenanceServiceMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useMaintenancePlansCatalogQuery, useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MezziRegistraTagliandoModal({
  open,
  mezzoId,
  tipoAttrezzatura,
  currentOreMezzo,
  defaultPlanId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mezzoId: string;
  tipoAttrezzatura: string;
  currentOreMezzo: number;
  defaultPlanId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const plansQ = useMaintenancePlansListQuery(open);
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const registerMut = useRegisterMaintenanceServiceMutation();

  const applicablePlans = useMemo(() => {
    if (!plansQ.data) return [] as MaintenancePlanView[];
    return resolvePlansForMezzo({
      tipoAttrezzatura,
      catalog: catalogQ.data ?? [],
      plans: plansQ.data,
    });
  }, [plansQ.data, catalogQ.data, tipoAttrezzatura]);

  const [planId, setPlanId] = useState(defaultPlanId ?? "");
  const [performedAt, setPerformedAt] = useState(todayIsoDate());
  const [oreAtService, setOreAtService] = useState(String(currentOreMezzo || 0));
  const [note, setNote] = useState("");
  const [selectedParts, setSelectedParts] = useState<Record<string, boolean>>({});

  const selectedPlan = applicablePlans.find((p) => p.id === planId) ?? applicablePlans[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const pid = defaultPlanId ?? applicablePlans[0]?.id ?? "";
    setPlanId(pid);
    setPerformedAt(todayIsoDate());
    setOreAtService(String(currentOreMezzo || 0));
    setNote("");
    const plan = applicablePlans.find((p) => p.id === pid) ?? applicablePlans[0];
    const parts: Record<string, boolean> = {};
    for (const part of plan?.parts ?? []) parts[part.ricambioId] = true;
    setSelectedParts(parts);
  }, [open, defaultPlanId, applicablePlans, currentOreMezzo]);

  useEffect(() => {
    if (!selectedPlan) return;
    setSelectedParts((prev) => {
      const next: Record<string, boolean> = {};
      for (const part of selectedPlan.parts) next[part.ricambioId] = prev[part.ricambioId] ?? true;
      return next;
    });
  }, [selectedPlan?.id]);

  const oreMismatch =
    Number(oreAtService) !== currentOreMezzo && Number.isFinite(Number(oreAtService));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    const ore = Number(oreAtService);
    if (!Number.isFinite(ore) || ore < 0) return;

    await registerMut.mutateAsync({
      mezzoId,
      planId: selectedPlan.id,
      performedAt,
      oreAtService: ore,
      mezzoOreSnapshot: currentOreMezzo,
      note,
      parts: selectedPlan.parts
        .filter((p) => selectedParts[p.ricambioId])
        .map((p) => ({
          ricambioId: p.ricambioId,
          quantita: p.quantita,
          descrizioneSnapshot: p.descrizione,
        })),
    });
    onSaved();
    onClose();
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
          <LoadingButton type="submit" form="registra-tagliando-form" className={dsBtnPrimary} loading={registerMut.isPending}>
            Salva
          </LoadingButton>
        </div>
      }
    >
      <GestionaleModalScrollBody>
        {applicablePlans.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun piano applicabile per questo tipo attrezzatura.</p>
        ) : (
          <form id="registra-tagliando-form" className="space-y-4" onSubmit={onSubmit}>
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
              <label className={dsFormLabel} htmlFor="rt-data">
                Data
              </label>
              <input
                id="rt-data"
                type="date"
                className={dsFormInput}
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                required
              />
            </div>
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-ore">
                Ore esecuzione
              </label>
              <input
                id="rt-ore"
                type="number"
                min={0}
                step={1}
                className={dsFormInput}
                value={oreAtService}
                onChange={(e) => setOreAtService(e.target.value)}
                required
              />
              {oreMismatch ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                  Le ore inserite differiscono dalle ore anagrafica mezzo ({currentOreMezzo} h). Verrà salvato uno snapshot
                  separato.
                </p>
              ) : null}
            </div>
            <div className={dsFormField}>
              <label className={dsFormLabel} htmlFor="rt-note">
                Note
              </label>
              <textarea
                id="rt-note"
                className={dsFormInput}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {selectedPlan && selectedPlan.parts.length > 0 ? (
              <div className={dsFormField}>
                <span className={dsFormLabel}>Ricambi utilizzati</span>
                <ul className="space-y-2">
                  {selectedPlan.parts.map((p) => (
                    <li key={p.ricambioId}>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedParts[p.ricambioId] ?? false}
                          onChange={(e) =>
                            setSelectedParts((prev) => ({ ...prev, [p.ricambioId]: e.target.checked }))
                          }
                        />
                        {p.descrizione} ({p.quantita})
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>
        )}
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
