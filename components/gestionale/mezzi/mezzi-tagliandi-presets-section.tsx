"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleListTable } from "@/components/gestionale/global-table";
import {
  MaintenancePresetEditorModal,
  emptyPlanDraft,
  planToDraft,
} from "@/components/gestionale/maintenance/maintenance-preset-editor-modal";
import { MezziTagliandiAssignModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-modal";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import { MAINTENANCE_PRESET_STATUS_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetSummary } from "@/lib/maintenance-plans/types";
import { gestionaleListTableRowBaseClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { useMaintenancePlanDeleteMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function MezziTagliandiPresetsSection({ canEdit }: { canEdit: boolean }) {
  const { validation: toastValidation } = useGestionaleToast();
  const settingsPayload = useCabAppSettingsPayloadQuery({ enabled: canEdit });
  const presetsQ = useServiceQuery(
    [...maintenancePlansQueryKeys.plans(), "summaries"] as const,
    () => maintenancePlansEntry.listPresetSummaries(),
    { staleTime: 30_000 },
  );
  const deleteMut = useMaintenancePlanDeleteMutation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "draft" | "archived">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState(() => emptyPlanDraft());
  const [deleteTarget, setDeleteTarget] = useState<MaintenancePresetSummary | null>(null);
  const [assignPreset, setAssignPreset] = useState<MaintenancePresetSummary | null>(null);

  useEffect(() => {
    const labels = settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura;
    if (!canEdit || !labels?.length) return;
    void maintenancePlansEntry.ensureCatalogLabels(labels).then((res) => {
      if (res.success && (res.data ?? 0) > 0) {
        toastValidation(`${res.data} tipo/i attrezzatura sincronizzati nel catalogo.`);
      }
    });
  }, [canEdit, settingsPayload.data?.resolved?.mezziListe?.tipiAttrezzatura, toastValidation]);

  const filtered = useMemo(() => {
    let rows = presetsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.tipoLabels.some((t) => t.toLowerCase().includes(q)) ||
          p.triggerSummary.toLowerCase().includes(q),
      );
    }
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    return rows;
  }, [presetsQ.data, search, statusFilter]);

  if (presetsQ.isLoading) {
    return <div className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento preset…</div>;
  }
  if (presetsQ.isError) {
    return (
      <LoadingErrorState title="Errore caricamento preset" onRetry={() => void presetsQ.refetch()} />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Preset riutilizzabili per il parco mezzi. I trigger in OR scadono al primo intervallo raggiunto.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca preset…"
          className="max-w-xs rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        >
          <option value="">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="draft">Bozza</option>
          <option value="archived">Archiviato</option>
        </select>
        <span className="text-xs text-[color:var(--cab-text-muted)]">{filtered.length} preset</span>
        {canEdit ? (
          <button
            type="button"
            className={`${dsBtnPrimary} ml-auto`}
            onClick={() => {
              setEditorDraft(emptyPlanDraft());
              setEditorOpen(true);
            }}
          >
            + Nuovo preset
          </button>
        ) : (
          <span className="ml-auto text-xs text-[color:var(--cab-text-muted)]" title={READONLY_PERMISSION_HINT}>
            Solo lettura
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[color:var(--cab-border)] p-8 text-center text-sm text-[color:var(--cab-text-muted)]">
          <p>Nessun preset tagliando. Crea il primo piano per il parco mezzi.</p>
          {canEdit ? (
            <button
              type="button"
              className={`${dsBtnPrimary} mt-4`}
              onClick={() => {
                setEditorDraft(emptyPlanDraft());
                setEditorOpen(true);
              }}
            >
              + Nuovo preset
            </button>
          ) : null}
        </div>
      ) : (
        <GestionaleListTable
          fixed
          headRow={
            <>
              <GlobalTableHeadLabel label="Nome" />
              <GlobalTableHeadLabel label="Trigger" />
              <GlobalTableHeadLabel label="Tipi" />
              <GlobalTableHeadLabel label="Mezzi" />
              <GlobalTableHeadLabel label="Esecuzioni" />
              <GlobalTableHeadLabel label="Stato" />
              <GlobalTableHeadLabel label="Azioni" />
            </>
          }
        >
          {filtered.map((p) => (
            <tr key={p.id} className={gestionaleListTableRowBaseClass}>
              <td className={`${gestionaleListTableTd} font-medium`}>{p.nome}</td>
              <td className={`${gestionaleListTableTd} text-xs`}>{p.triggerSummary}</td>
              <td className={`${gestionaleListTableTd} text-[color:var(--cab-text-muted)]`}>
                {p.tipoLabels.join(", ") || "—"}
              </td>
              <td className={gestionaleListTableTd}>
                <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-xs font-medium">
                  {p.assignedMezziCount}
                </span>
              </td>
              <td className={gestionaleListTableTd}>{p.executionsCount}</td>
              <td className={gestionaleListTableTd}>{MAINTENANCE_PRESET_STATUS_LABELS[p.status]}</td>
              <td className={gestionaleListTableTd}>
                {canEdit ? (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className={dsBtnNeutral}
                      onClick={() => {
                        setEditorDraft(planToDraft(p, p.assignedMezziCount));
                        setEditorOpen(true);
                      }}
                    >
                      Modifica
                    </button>
                    {p.status === "active" ? (
                      <button type="button" className={dsBtnNeutral} onClick={() => setAssignPreset(p)}>
                        Assegna
                      </button>
                    ) : null}
                    {p.status !== "archived" ? (
                      <button type="button" className={dsBtnNeutral} onClick={() => setDeleteTarget(p)}>
                        Archivia
                      </button>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </GestionaleListTable>
      )}

      <MaintenancePresetEditorModal
        open={editorOpen}
        initial={editorDraft}
        onClose={() => {
          setEditorOpen(false);
          void presetsQ.refetch();
        }}
      />

      <MezziTagliandiAssignModal
        open={assignPreset != null}
        preset={assignPreset}
        onClose={() => {
          setAssignPreset(null);
          void presetsQ.refetch();
        }}
      />

      <GestionaleConfirmDialog
        open={deleteTarget != null}
        title="Archiviare il preset?"
        message={
          deleteTarget
            ? deleteTarget.assignedMezziCount > 0
              ? `"${deleteTarget.nome}" è usato da ${deleteTarget.assignedMezziCount} mezzo/i. L'archiviazione non rimuove le assegnazioni esistenti.`
              : `Il preset "${deleteTarget.nome}" non sarà più selezionabile per nuove assegnazioni.`
            : ""
        }
        confirmLabel="Archivia"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
          void presetsQ.refetch();
        }}
      />
    </div>
  );
}
