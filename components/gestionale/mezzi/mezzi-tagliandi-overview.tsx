"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { GestionaleListTable, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { MezziTagliandiAssignModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-modal";
import { buildMezziTagliandiHubHref } from "@/lib/navigation/mezzi-tagliandi-links";
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
import { gestionaleListTableRowBaseClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import {
  useMezziWithoutPresetQuery,
  useTagliandiOverviewQuery,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";

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

function OverviewGroupTable({
  title,
  subtitle,
  rows,
  canEdit,
  highlightConfigId,
  onRowClick,
}: {
  title: string;
  subtitle?: string;
  rows: TagliandiOverviewRow[];
  canEdit: boolean;
  highlightConfigId: string | null;
  onRowClick: (row: TagliandiOverviewRow) => void;
}) {
  const sorted = sortOverviewByNextDue(rows);
  return (
    <section className="mb-6">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</h3>
        {subtitle ? <p className="text-xs text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
      </div>
      <GestionaleListTable
        fixed
        headRow={
          <>
            <GlobalTableHeadLabel label="Mezzo" />
            <GlobalTableHeadLabel label="Targa / codice" />
            <GlobalTableHeadLabel label="Ultimo" />
            <GlobalTableHeadLabel label="Prossimo" />
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
              <td className={gestionaleListTableTd}>{row.attrezzaturaLabel}</td>
              <td className={gestionaleListTableTd}>
                {[row.targa, row.numeroScuderia].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className={`${gestionaleListTableTd} font-mono text-xs`}>{fmtUltimo(row)}</td>
              <td className={`${gestionaleListTableTd} font-mono text-xs`}>{fmtProssimo(row)}</td>
              <td className={`${gestionaleListTableTd} font-mono text-xs`}>{row.currentValue}</td>
              <td className={gestionaleListTableTd}>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TAGLIANDO_STATO_BADGE_CLASS[stato]}`}>
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
    <section className="mb-6">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Senza preset assegnato</h3>
        <p className="text-xs text-[color:var(--cab-text-muted)]">{rows.length} mezzi senza piano attivo</p>
      </div>
      <GestionaleListTable
        fixed
        headRow={
          <>
            <GlobalTableHeadLabel label="Mezzo" />
            <GlobalTableHeadLabel label="Targa / codice" />
            <GlobalTableHeadLabel label="Tipo" />
            {canEdit ? <GlobalTableHeadLabel label="Azioni" /> : null}
          </>
        }
      >
        {rows.map((row) => (
          <tr key={row.mezzoId} className={gestionaleListTableRowBaseClass}>
            <td className={gestionaleListTableTd}>{row.attrezzaturaLabel}</td>
            <td className={gestionaleListTableTd}>
              {[row.targa, row.numeroScuderia].filter(Boolean).join(" · ") || "—"}
            </td>
            <td className={gestionaleListTableTd}>{row.tipoAttrezzatura || "—"}</td>
            {canEdit ? (
              <td className={gestionaleListTableTd}>
                <button
                  type="button"
                  className={dsBtnPrimary}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(row.mezzoId);
                  }}
                >
                  Assegna preset
                </button>
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
}: {
  canEdit: boolean;
  presetFilter?: string;
  statoFilter?: TagliandoStatoUi | "";
  highlightConfigId?: string | null;
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

  const filtered = useMemo(() => {
    const rows = overviewQ.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
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
  }, [overviewQ.data, search, localPresetFilter, localStatoFilter]);

  const groups = useMemo(() => groupOverviewByPreset(filtered), [filtered]);
  const kpi = useMemo(() => selectDashboardMaintenanceCards(filtered), [filtered]);
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
      router.push(buildMezziTagliandiHubHref({ mezzoId: row.mezzoId, highlight: row.configId }));
    },
    [router],
  );

  if (overviewQ.isLoading) {
    return <div className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento overview tagliandi…</div>;
  }

  if (overviewQ.isError) {
    return (
      <LoadingErrorState title="Errore caricamento overview tagliandi" onRetry={() => void overviewQ.refetch()} />
    );
  }

  const hasContent = groups.length > 0 || filteredWithout.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 text-left text-sm hover:bg-[var(--cab-hover)]"
          onClick={() => setLocalStatoFilter(localStatoFilter === "imminente" ? "" : "imminente")}
        >
          <div className="text-[color:var(--cab-text-muted)]">Prossimi 7 giorni</div>
          <div className="text-lg font-semibold">{kpi.prossimi7g}</div>
        </button>
        <button
          type="button"
          className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 text-left text-sm hover:bg-[var(--cab-hover)]"
          onClick={() => setLocalStatoFilter(localStatoFilter === "imminente" ? "" : "imminente")}
        >
          <div className="text-[color:var(--cab-text-muted)]">Prossimi 30 giorni</div>
          <div className="text-lg font-semibold">{kpi.prossimi30g}</div>
        </button>
        <button
          type="button"
          className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 text-left text-sm hover:bg-[var(--cab-hover)]"
          onClick={() => setLocalStatoFilter(localStatoFilter === "scaduto" ? "" : "scaduto")}
        >
          <div className="text-[color:var(--cab-text-muted)]">Scaduti</div>
          <div className="text-lg font-semibold text-red-700 dark:text-red-300">{kpi.scaduti}</div>
        </button>
        <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 text-sm">
          <div className="text-[color:var(--cab-text-muted)]">Mezzi critici</div>
          <div className="text-lg font-semibold">{kpi.mezziCritici}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca targa, scuderia, mezzo…"
          className="max-w-xs rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        />
        <select
          value={localPresetFilter}
          onChange={(e) => setLocalPresetFilter(e.target.value)}
          className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        >
          <option value="">Tutti i preset</option>
          {(plansQ.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select
          value={localStatoFilter}
          onChange={(e) => setLocalStatoFilter(e.target.value as TagliandoStatoUi | "")}
          className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-1.5 text-sm"
        >
          <option value="">Tutti gli stati</option>
          {(Object.keys(TAGLIANDO_STATO_LABELS) as TagliandoStatoUi[]).map((s) => (
            <option key={s} value={s}>
              {TAGLIANDO_STATO_LABELS[s]}
            </option>
          ))}
        </select>
        {(localPresetFilter || localStatoFilter) && (
          <button
            type="button"
            className={dsBtnNeutral}
            onClick={() => {
              setLocalPresetFilter("");
              setLocalStatoFilter("");
            }}
          >
            Azzera filtri
          </button>
        )}
        <span className="text-xs text-[color:var(--cab-text-muted)]">{filtered.length} configurazioni</span>
      </div>

      {!hasContent ? (
        <div className="rounded-lg border border-dashed border-[color:var(--cab-border)] p-8 text-center text-sm text-[color:var(--cab-text-muted)]">
          <p>Nessun piano manutentivo attivo. Crea un preset e assegnalo ai mezzi.</p>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <OverviewGroupTable
              key={g.key}
              title={g.presetId ? `Preset: ${g.presetNome}` : g.presetNome}
              subtitle={
                g.presetId
                  ? `${g.rows.length} mezzi · ${triggerByPreset.get(g.presetId) ?? ""}`
                  : `${g.rows.length} mezzi`
              }
              rows={g.rows}
              canEdit={canEdit}
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
        </>
      )}

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
