"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import type { MaintenancePresetSummary } from "@/lib/maintenance-plans/types";
import type { MezzoWithoutPresetRow } from "@/lib/maintenance-plans/v2-types";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormInput, dsFormLabel, dsScrollbar } from "@/lib/ui/design-system";
import {
  useMaintenancePlansCatalogQuery,
  useMaintenancePlansListQuery,
} from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useBulkAssignPresetMutation } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function MezziTagliandiAssignModal({
  open,
  preset: presetProp,
  preselectedMezzoIds = [],
  onClose,
}: {
  open: boolean;
  preset: MaintenancePresetSummary | null;
  preselectedMezzoIds?: string[];
  onClose: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [presetId, setPresetId] = useState(presetProp?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselectedMezzoIds));
  const [replaceConfirm, setReplaceConfirm] = useState(false);

  const presetsQ = useMaintenancePlansListQuery(open);
  const catalogQ = useMaintenancePlansCatalogQuery(open);
  const withoutQ = useServiceQuery(
    [...maintenancePlansQueryKeys.root, "without-preset"] as const,
    () => maintenancePlansEntry.listMezziWithoutPreset(),
    { enabled: open },
  );
  const assignMut = useBulkAssignPresetMutation();

  useEffect(() => {
    if (!open) return;
    setPresetId(presetProp?.id ?? "");
    setSelected(new Set(preselectedMezzoIds));
  }, [open, presetProp, preselectedMezzoIds]);

  const activePresets = useMemo(
    () => (presetsQ.data ?? []).filter((p) => p.status === "active"),
    [presetsQ.data],
  );
  const selectedPreset = activePresets.find((p) => p.id === presetId) ?? presetProp;

  const compatibleMezzi = useMemo(() => {
    const rows = withoutQ.data ?? [];
    if (!selectedPreset || !catalogQ.data) return rows;
    return rows.filter((m) =>
      resolvePlansForMezzo({
        tipoAttrezzatura: m.tipoAttrezzatura,
        catalog: catalogQ.data ?? [],
        plans: [selectedPreset],
      }).length > 0,
    );
  }, [withoutQ.data, selectedPreset, catalogQ.data]);

  const toggleMezzo = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function runAssign(replaceExisting: boolean) {
    if (!presetId || selected.size === 0) {
      gestToast.validation("Seleziona un preset e almeno un mezzo.");
      return;
    }
    try {
      const res = await assignMut.mutateAsync({
        presetId,
        mezzoIds: [...selected],
        replaceExisting,
      });
      const { assigned, skipped } = res;
      if (skipped.length > 0) {
        gestToast.info(`Assegnati ${assigned}/${selected.size} mezzi. ${skipped.length} saltati.`);
      } else {
        gestToast.successOnce("bulk-assign", `Piano assegnato a ${assigned} mezzi.`);
      }
      onClose();
    } catch (err) {
      gestToast.error(err, { entity: "mezzo", action: "update" });
    }
  }

  if (!open) return null;

  return (
    <>
      <GestionaleModalShell
        onRequestClose={onClose}
        title="Assegna preset ai mezzi"
        titleId="tagliandi-assign-title"
        modalSize="formMedium"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={dsBtnNeutral} onClick={onClose}>
              Annulla
            </button>
            <LoadingButton
              type="button"
              className={dsBtnPrimary}
              loading={assignMut.isPending}
              onClick={() => setReplaceConfirm(true)}
              disabled={!presetId || selected.size === 0}
            >
              Assegna ({selected.size})
            </LoadingButton>
          </div>
        }
      >
        <GestionaleModalScrollBody>
          <div className={dsFormField}>
            <label className={dsFormLabel} htmlFor="assign-preset">
              Preset
            </label>
            <select
              id="assign-preset"
              className={dsFormInput}
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={Boolean(presetProp)}
            >
              <option value="">Seleziona preset…</option>
              {activePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <p className="mb-2 text-xs text-[color:var(--cab-text-muted)]">
            {compatibleMezzi.length} mezzi compatibili senza piano attivo
          </p>
          <div className={`max-h-64 overflow-y-auto rounded-md border border-[color:var(--cab-border)] ${dsScrollbar}`}>
            {withoutQ.isLoading ? (
              <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Caricamento mezzi…</p>
            ) : compatibleMezzi.length === 0 ? (
              <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessun mezzo compatibile disponibile.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--cab-border)]">
                {compatibleMezzi.map((m: MezzoWithoutPresetRow) => (
                  <li key={m.mezzoId}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--cab-hover)]">
                      <input
                        type="checkbox"
                        checked={selected.has(m.mezzoId)}
                        onChange={() => toggleMezzo(m.mezzoId)}
                      />
                      <span className="font-medium">{m.attrezzaturaLabel}</span>
                      <span className="text-[color:var(--cab-text-muted)]">
                        {[m.targa, m.numeroScuderia].filter(Boolean).join(" · ") || m.tipoAttrezzatura}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GestionaleModalScrollBody>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={replaceConfirm}
        title="Conferma assegnazione"
        message={`Assegnare il preset a ${selected.size} mezzo/i? Se esiste già un piano dello stesso tipo, verrà sostituito e la pianificazione ricalcolata.`}
        confirmLabel="Assegna"
        onCancel={() => setReplaceConfirm(false)}
        onConfirm={async () => {
          setReplaceConfirm(false);
          await runAssign(true);
        }}
      />
    </>
  );
}
