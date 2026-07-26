"use client";

import { useMemo, useState } from "react";
import { IconActionButton, LoadingErrorState, PageToolbarResultCount } from "@/components/design-system";
import { HubIconPencil, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GestionaleListTableMobileEmpty,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  MaintenancePresetEditorModal,
  emptyPlanDraft,
  planToDraft,
} from "@/components/gestionale/maintenance/maintenance-preset-editor-modal";
import { MezziTagliandiAssignModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-modal";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import {
  MAINTENANCE_PRESET_STATUS_BADGE_CLASS,
  MAINTENANCE_PRESET_STATUS_LABELS,
} from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetSummary } from "@/lib/maintenance-plans/types";
import {
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableTdPill,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import {
  dsInput,
  dsPageToolbar,
  dsPageToolbarCtaCompact,
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { useMaintenancePlanDeleteMutation } from "@/src/hooks/gestionale/use-maintenance-plan-mutations";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { maintenancePlansQueryKeys } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

const PRESET_STATUS_FILTER_ITEMS = [
  { value: "", label: "Tutti gli stati" },
  { value: "active", label: "Attivo" },
  { value: "draft", label: "Bozza" },
  { value: "archived", label: "Archiviato" },
] as const;

const presetFilterSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;
const presetTableTd = `${gestionaleListTableTd} py-2`;
const presetTableActionsColClass = "w-[8.75rem] min-w-[8.75rem]";

function IconPresetAssign({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.193-9.193a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function PresetRowActions({
  preset,
  onEdit,
  onAssign,
  onArchive,
}: {
  preset: MaintenancePresetSummary;
  onEdit: () => void;
  onAssign: () => void;
  onArchive: () => void;
}) {
  return (
    <>
      <IconActionButton label="Modifica" tooltipForce className={dsTableActionBtnPrimary} onClick={onEdit}>
        <HubIconPencil className={dsTableActionGlyph} />
      </IconActionButton>
      {preset.status === "active" ? (
        <IconActionButton label="Assegna ai mezzi" tooltipForce className={dsTableActionBtnSecondary} onClick={onAssign}>
          <IconPresetAssign />
        </IconActionButton>
      ) : null}
      {preset.status !== "archived" ? (
        <IconActionButton label="Archivia" tooltipForce className={dsTableActionBtnDanger} onClick={onArchive}>
          <HubIconTrash className={dsTableActionGlyph} />
        </IconActionButton>
      ) : null}
    </>
  );
}

function openNewPresetEditor(
  setEditorDraft: (draft: ReturnType<typeof emptyPlanDraft>) => void,
  setEditorOpen: (open: boolean) => void,
) {
  setEditorDraft(emptyPlanDraft());
  setEditorOpen(true);
}

export function MezziTagliandiPresetsSection({ canEdit }: { canEdit: boolean }) {
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

  const allPresets = presetsQ.data ?? [];
  const searchActive = search.trim().length > 0;
  const filtersActive = Boolean(statusFilter);

  const filtered = useMemo(() => {
    let rows = allPresets;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) => p.nome.toLowerCase().includes(q) || p.triggerSummary.toLowerCase().includes(q),
      );
    }
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    return rows;
  }, [allPresets, search, statusFilter]);

  if (presetsQ.isLoading) {
    return <div className="text-sm text-[color:var(--cab-text-muted)]">Caricamento preset…</div>;
  }
  if (presetsQ.isError) {
    return (
      <LoadingErrorState title="Errore caricamento preset" onRetry={() => void presetsQ.refetch()} />
    );
  }

  const emptyMessage =
    allPresets.length === 0
      ? "Nessun preset tagliando. Crea il primo piano per il parco mezzi."
      : "Nessun preset corrisponde ai criteri.";

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Preset riutilizzabili per il parco mezzi. I trigger in OR scadono al primo intervallo raggiunto.
      </p>

      <div className={`${dsPageToolbar} min-w-0 w-full max-w-full`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <GestionaleSearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca preset…"
            aria-label="Cerca preset"
            wrapperClassName="min-w-0 flex-1"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-full min-w-[10.5rem] sm:w-[11.5rem]">
              <GlobalSelect
                variant="filter"
                inputClassName={presetFilterSelectClass}
                items={[...PRESET_STATUS_FILTER_ITEMS]}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as typeof statusFilter)}
                strictFromList
                selectOnly
                aria-label="Filtra per stato preset"
              />
            </div>
            <PageToolbarResultCount
              count={filtered.length}
              singularLabel="preset"
              pluralLabel="preset"
              filtersActive={filtersActive}
              searchActive={searchActive}
              onFilterReset={filtersActive ? () => setStatusFilter("") : undefined}
              onSearchReset={searchActive ? () => setSearch("") : undefined}
              className="min-w-0 flex-initial"
            />
            {canEdit ? (
              <div className={gestionalePageToolbarActionsClass}>
                <button
                  type="button"
                  className={dsPageToolbarCtaCompact}
                  onClick={() => openNewPresetEditor(setEditorDraft, setEditorOpen)}
                >
                  + Nuovo preset
                </button>
              </div>
            ) : (
              <span className="text-xs text-[color:var(--cab-text-muted)]" title={READONLY_PERMISSION_HINT}>
                Solo lettura
              </span>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <GestionaleListTableMobileEmpty message={emptyMessage} />
      ) : (
        <GestionaleListTable
          fixed
          colgroup={
            <>
              <col className="w-[26%]" />
              <col className="w-[28%]" />
              <col className="w-[4.5rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[6.5rem]" />
              <col className={presetTableActionsColClass} />
            </>
          }
          headRow={
            <>
              <GlobalTableHeadLabel label="Nome" />
              <GlobalTableHeadLabel label="Intervalli" />
              <GlobalTableHeadLabel label="Ricambi" align="center" />
              <GlobalTableHeadLabel label="Mezzi" align="center" />
              <GlobalTableHeadLabel label="Esecuzioni" align="center" />
              <GlobalTableHeadLabel label="Stato" align="center" />
              <GestionaleListTableActionsHead />
            </>
          }
        >
          {filtered.map((p) => (
            <tr key={p.id} className={gestionaleListTableRowClass}>
              <td className={`${presetTableTd} font-medium text-[color:var(--cab-text)]`}>{p.nome}</td>
              <td className={`${presetTableTd} text-xs leading-snug text-[color:var(--cab-text-muted)]`}>
                {p.triggerSummary}
              </td>
              <td className={gestionaleListTableTdCenter}>{p.parts.length}</td>
              <td className={gestionaleListTableTdCenter}>{p.assignedMezziCount}</td>
              <td className={gestionaleListTableTdCenter}>{p.executionsCount}</td>
              <td className={gestionaleListTableTdPill}>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MAINTENANCE_PRESET_STATUS_BADGE_CLASS[p.status]}`}
                >
                  {MAINTENANCE_PRESET_STATUS_LABELS[p.status]}
                </span>
              </td>
              <td className={gestionaleListTableTdAzioni}>
                {canEdit ? (
                  <div className={gestionaleListTableActionsGroupEnd}>
                    <PresetRowActions
                      preset={p}
                      onEdit={() => {
                        setEditorDraft(planToDraft(p, p.assignedMezziCount));
                        setEditorOpen(true);
                      }}
                      onAssign={() => setAssignPreset(p)}
                      onArchive={() => setDeleteTarget(p)}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--cab-text-muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </GestionaleListTable>
      )}

      {filtered.length === 0 && canEdit && allPresets.length === 0 ? (
        <div className="flex justify-center">
          <button
            type="button"
            className={dsPageToolbarCtaCompact}
            onClick={() => openNewPresetEditor(setEditorDraft, setEditorOpen)}
          >
            + Nuovo preset
          </button>
        </div>
      ) : null}

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
