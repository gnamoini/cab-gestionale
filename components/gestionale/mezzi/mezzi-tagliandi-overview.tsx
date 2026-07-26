"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LoadingErrorState, PageToolbarResultCount } from "@/components/design-system";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GestionaleListTableMobileEmpty,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { MezziTagliandiAssignModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-modal";
import { reportMetricCardCompactClass } from "@/components/report/report-ui-tokens";
import { buildMezziAnagraficaHubHref } from "@/lib/navigation/mezzi-tagliandi-links";
import { selectDashboardMaintenanceCards } from "@/lib/maintenance-plans/kpi/maintenance-kpi-selectors";
import {
  groupOverviewByPreset,
  sortOverviewByNextDue,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";
import {
  TAGLIANDO_STATO_BADGE_CLASS,
  TAGLIANDO_STATO_LABELS,
  TAGLIANDO_STATO_ROW_CLASS,
  mapUrgencyToTagliandoStato,
  tagliandoStatoFilterMatches,
  type TagliandoStatoUi,
} from "@/lib/maintenance-plans/tagliando-stato-labels";
import type { TagliandiOverviewRow } from "@/lib/maintenance-plans/v2-types";
import type { MezzoWithoutPresetRow } from "@/lib/maintenance-plans/v2-types";
import {
  gestionaleListTableRowBaseClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableTdPill,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import {
  dsCardTitle,
  dsFocus,
  dsInput,
  dsPageToolbar,
  dsTableActionTextBtnPrimary,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  useMezziWithoutPresetQuery,
  useTagliandiOverviewQuery,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

const overviewFilterSelectClass = `${dsInput} min-h-11 py-2 text-sm font-semibold`;

const TAGLIANDO_STATO_FILTER_ITEMS = [
  { value: "", label: "Tutti gli stati" },
  ...(Object.keys(TAGLIANDO_STATO_LABELS) as TagliandoStatoUi[]).map((s) => ({
    value: s,
    label: TAGLIANDO_STATO_LABELS[s],
  })),
];

function fmtDate(ymd: string | null): string {
  if (!ymd) return "—";
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT");
  } catch {
    return ymd;
  }
}

function fmtUltimo(row: TagliandiOverviewRow): string {
  if (row.ultimoPerformedAt) return fmtDate(row.ultimoPerformedAt);
  if (row.ultimoValueAtService != null) return String(Math.round(row.ultimoValueAtService));
  return "—";
}

function fmtProssimo(row: TagliandiOverviewRow): string {
  if (row.nextDateEstimated) return fmtDate(row.nextDateEstimated);
  if (row.remainingValue != null) return `${Math.round(row.remainingValue)} rimanenti`;
  return "—";
}

function tagliandiKpiTileClass(active: boolean, interactive: boolean): string {
  const base = `${reportMetricCardCompactClass} min-h-[4.75rem] justify-center`;
  if (!interactive) return base;
  const activeClass = active
    ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]"
    : "hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)]";
  return `${base} ${activeClass} transition-[border-color,box-shadow,background-color] duration-200 ${dsFocus}`;
}

function TagliandiOverviewKpiTile({
  label,
  value,
  valueClassName = "text-[color:var(--cab-text)]",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  valueClassName?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className={`${dsTypoCaption} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={tagliandiKpiTileClass(active, true)} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={tagliandiKpiTileClass(false, false)}>{content}</div>;
}

function OverviewGroupTable({
  title,
  subtitle,
  rows,
  highlightConfigId,
  onRowClick,
}: {
  title: string;
  subtitle?: string;
  rows: TagliandiOverviewRow[];
  highlightConfigId: string | null;
  onRowClick: (row: TagliandiOverviewRow) => void;
}) {
  const sorted = sortOverviewByNextDue(rows);
  return (
    <section className="space-y-3">
      <div className="min-w-0">
        <h3 className={dsCardTitle}>{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
      </div>
      <GestionaleListTable
        fixed
        headRow={
          <>
            <GlobalTableHeadLabel label="Mezzo" />
            <GlobalTableHeadLabel label="Targa / codice" />
            <GlobalTableHeadLabel label="Ultimo" />
            <GlobalTableHeadLabel label="Prossimo" />
            <GlobalTableHeadLabel label="Motivo scadenza" />
            <GlobalTableHeadLabel label="Ore/km attuali" />
            <GlobalTableHeadLabel label="Stato" />
          </>
        }
      >
        {sorted.map((row) => {
          const stato = mapUrgencyToTagliandoStato(row.urgency);
          const highlighted = highlightConfigId === row.configId;
          return (
            <tr
              key={row.configId}
              className={`${gestionaleListTableRowBaseClass} ${TAGLIANDO_STATO_ROW_CLASS[stato]} cursor-pointer hover:bg-[var(--cab-hover)] ${highlighted ? "ring-2 ring-[var(--cab-primary)] ring-inset" : ""}`}
              onClick={() => onRowClick(row)}
              aria-label={`Apri tagliandi ${row.attrezzaturaLabel}`}
            >
              <td className={`${gestionaleListTableTd} font-medium text-[color:var(--cab-text)]`}>
                {row.attrezzaturaLabel}
              </td>
              <td className={`${gestionaleListTableTd} text-[color:var(--cab-text-muted)]`}>
                {[row.targa, row.numeroScuderia].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className={gestionaleListTableTdCenter}>{fmtUltimo(row)}</td>
              <td className={gestionaleListTableTdCenter}>{fmtProssimo(row)}</td>
              <td className={`${gestionaleListTableTd} max-w-[14rem] truncate text-xs text-[color:var(--cab-text-muted)]`} title={row.dueReasonLabel}>
                {row.dueReasonLabel}
              </td>
              <td className={gestionaleListTableTdCenter}>{row.currentValue}</td>
              <td className={gestionaleListTableTdPill}>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TAGLIANDO_STATO_BADGE_CLASS[stato]}`}
                >
                  {TAGLIANDO_STATO_LABELS[stato]}
                </span>
              </td>
            </tr>
          );
        })}
      </GestionaleListTable>
    </section>
  );
}

function WithoutPresetGroup({
  rows,
  canEdit,
  onAssign,
}: {
  rows: MezzoWithoutPresetRow[];
  canEdit: boolean;
  onAssign: (mezzoId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="min-w-0">
        <h3 className={dsCardTitle}>Senza preset assegnato</h3>
        <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{rows.length} mezzi senza piano attivo</p>
      </div>
      <GestionaleListTable
        fixed
        headRow={
          <>
            <GlobalTableHeadLabel label="Mezzo" />
            <GlobalTableHeadLabel label="Targa / codice" />
            <GlobalTableHeadLabel label="Tipo" />
            {canEdit ? <GestionaleListTableActionsHead /> : null}
          </>
        }
      >
        {rows.map((row) => (
          <tr key={row.mezzoId} className={gestionaleListTableRowBaseClass}>
            <td className={`${gestionaleListTableTd} font-medium text-[color:var(--cab-text)]`}>
              {row.attrezzaturaLabel}
            </td>
            <td className={`${gestionaleListTableTd} text-[color:var(--cab-text-muted)]`}>
              {[row.targa, row.numeroScuderia].filter(Boolean).join(" · ") || "—"}
            </td>
            <td className={gestionaleListTableTd}>{row.tipoAttrezzatura || "—"}</td>
            {canEdit ? (
              <td className={gestionaleListTableTdAzioni}>
                <div className={gestionaleListTableActionsGroupEnd}>
                  <button
                    type="button"
                    className={dsTableActionTextBtnPrimary}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign(row.mezzoId);
                    }}
                  >
                    Assegna preset
                  </button>
                </div>
              </td>
            ) : null}
          </tr>
        ))}
      </GestionaleListTable>
    </section>
  );
}

export function MezziTagliandiOverview({
  canEdit,
  presetFilter = "",
  statoFilter = "",
  highlightConfigId = null,
  onOpenMezzoHub,
}: {
  canEdit: boolean;
  presetFilter?: string;
  statoFilter?: TagliandoStatoUi | "";
  highlightConfigId?: string | null;
  onOpenMezzoHub?: (mezzoId: string) => void;
}) {
  const router = useRouter();
  const overviewQ = useTagliandiOverviewQuery(true);
  const withoutQ = useMezziWithoutPresetQuery(true);
  const plansQ = useMaintenancePlansListQuery(true);
  const [search, setSearch] = useState("");
  const [localPresetFilter, setLocalPresetFilter] = useState(presetFilter);
  const [localStatoFilter, setLocalStatoFilter] = useState<TagliandoStatoUi | "">(statoFilter);
  const [assignMezzoIds, setAssignMezzoIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    setLocalPresetFilter(presetFilter);
  }, [presetFilter]);
  useEffect(() => {
    setLocalStatoFilter(statoFilter);
  }, [statoFilter]);

  const allRows = overviewQ.data ?? [];
  const searchActive = search.trim().length > 0;
  const filtersActive = Boolean(localPresetFilter || localStatoFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const stato = mapUrgencyToTagliandoStato(r.urgency);
      if (localPresetFilter && r.presetId !== localPresetFilter) return false;
      if (!tagliandoStatoFilterMatches(stato, localStatoFilter)) return false;
      if (!q) return true;
      return (
        (r.targa ?? "").toLowerCase().includes(q) ||
        (r.numeroScuderia ?? "").toLowerCase().includes(q) ||
        r.attrezzaturaLabel.toLowerCase().includes(q) ||
        r.presetNome.toLowerCase().includes(q)
      );
    });
  }, [allRows, search, localPresetFilter, localStatoFilter]);

  const groups = useMemo(() => groupOverviewByPreset(filtered), [filtered]);
  const kpi = useMemo(() => selectDashboardMaintenanceCards(filtered), [filtered]);
  const presetFilterItems = useMemo(
    () => [
      { value: "", label: "Tutti i preset" },
      ...(plansQ.data ?? []).map((p) => ({ value: p.id, label: p.nome })),
    ],
    [plansQ.data],
  );
  const triggerByPreset = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plansQ.data ?? []) {
      const triggers = p.triggerGroups[0]?.triggers ?? [];
      const label =
        triggers.length > 0
          ? triggers.map((t) => `${t.threshold} ${t.triggerType}`).join(" OR ")
          : `${p.intervalValue} ${p.intervalType}`;
      map.set(p.id, label);
    }
    return map;
  }, [plansQ.data]);

  const filteredWithout = useMemo(() => {
    const rows = withoutQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.targa ?? "").toLowerCase().includes(q) ||
        (r.numeroScuderia ?? "").toLowerCase().includes(q) ||
        r.attrezzaturaLabel.toLowerCase().includes(q) ||
        r.tipoAttrezzatura.toLowerCase().includes(q),
    );
  }, [withoutQ.data, search]);

  const onRowClick = useCallback(
    (row: TagliandiOverviewRow) => {
      if (onOpenMezzoHub) {
        onOpenMezzoHub(row.mezzoId);
        return;
      }
      router.push(buildMezziAnagraficaHubHref({ mezzoId: row.mezzoId }));
    },
    [onOpenMezzoHub, router],
  );

  const toggleStatoFilter = useCallback((stato: TagliandoStatoUi) => {
    setLocalStatoFilter((prev) => (prev === stato ? "" : stato));
  }, []);

  if (overviewQ.isLoading) {
    return <div className="text-sm text-[color:var(--cab-text-muted)]">Caricamento overview tagliandi…</div>;
  }

  if (overviewQ.isError) {
    return (
      <LoadingErrorState title="Errore caricamento overview tagliandi" onRetry={() => void overviewQ.refetch()} />
    );
  }

  const hasContent = groups.length > 0 || filteredWithout.length > 0;
  const emptyMessage =
    allRows.length === 0 && (withoutQ.data ?? []).length === 0
      ? "Nessun piano manutentivo attivo. Crea un preset e assegnalo ai mezzi."
      : "Nessuna configurazione corrisponde ai criteri.";

  let content: ReactNode;
  if (!hasContent) {
    content = <GestionaleListTableMobileEmpty message={emptyMessage} />;
  } else {
    content = (
      <div className="space-y-6">
        {groups.map((g) => (
          <OverviewGroupTable
            key={g.key}
            title={g.presetId ? g.presetNome : g.presetNome}
            subtitle={
              g.presetId
                ? `${g.rows.length} mezzi · ${triggerByPreset.get(g.presetId) ?? ""}`
                : `${g.rows.length} mezzi`
            }
            rows={g.rows}
            highlightConfigId={highlightConfigId}
            onRowClick={onRowClick}
          />
        ))}
        <WithoutPresetGroup
          rows={filteredWithout}
          canEdit={canEdit}
          onAssign={(mezzoId) => {
            setAssignMezzoIds([mezzoId]);
            setAssignOpen(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <TagliandiOverviewKpiTile
          label="Prossimi 7 giorni"
          value={kpi.prossimi7g}
          active={localStatoFilter === "imminente"}
          onClick={() => toggleStatoFilter("imminente")}
        />
        <TagliandiOverviewKpiTile
          label="Prossimi 30 giorni"
          value={kpi.prossimi30g}
          active={localStatoFilter === "imminente"}
          onClick={() => toggleStatoFilter("imminente")}
        />
        <TagliandiOverviewKpiTile
          label="Scaduti"
          value={kpi.scaduti}
          valueClassName="text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]"
          active={localStatoFilter === "scaduto"}
          onClick={() => toggleStatoFilter("scaduto")}
        />
        <TagliandiOverviewKpiTile label="Mezzi critici" value={kpi.mezziCritici} />
      </div>

      <div className={`${dsPageToolbar} min-w-0 w-full max-w-full`}>
        <div className="flex flex-col gap-3">
          <GestionaleSearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca targa, scuderia, mezzo…"
            aria-label="Cerca configurazioni tagliando"
            wrapperClassName="min-w-0 w-full"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-full min-w-[10.5rem] sm:w-[14rem]">
              <GlobalSelect
                variant="filter"
                inputClassName={overviewFilterSelectClass}
                items={presetFilterItems}
                value={localPresetFilter}
                onChange={setLocalPresetFilter}
                strictFromList
                selectOnly
                aria-label="Filtra per preset"
              />
            </div>
            <div className="w-full min-w-[10.5rem] sm:w-[11.5rem]">
              <GlobalSelect
                variant="filter"
                inputClassName={overviewFilterSelectClass}
                items={TAGLIANDO_STATO_FILTER_ITEMS}
                value={localStatoFilter}
                onChange={(v) => setLocalStatoFilter(v as TagliandoStatoUi | "")}
                strictFromList
                selectOnly
                aria-label="Filtra per stato tagliando"
              />
            </div>
            <PageToolbarResultCount
              count={filtered.length}
              singularLabel="configurazione"
              pluralLabel="configurazioni"
              filtersActive={filtersActive}
              searchActive={searchActive}
              onFilterReset={
                filtersActive
                  ? () => {
                      setLocalPresetFilter("");
                      setLocalStatoFilter("");
                    }
                  : undefined
              }
              onSearchReset={searchActive ? () => setSearch("") : undefined}
              className="min-w-0 flex-initial"
            />
          </div>
        </div>
      </div>

      {content}

      <MezziTagliandiAssignModal
        open={assignOpen}
        preset={null}
        preselectedMezzoIds={assignMezzoIds}
        onClose={() => {
          setAssignOpen(false);
          setAssignMezzoIds([]);
          void overviewQ.refetch();
          void withoutQ.refetch();
        }}
      />
    </div>
  );
}
