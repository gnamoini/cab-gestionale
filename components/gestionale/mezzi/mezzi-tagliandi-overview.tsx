"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LoadingErrorState } from "@/components/design-system";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GestionaleListTableMobileEmpty,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import { MezziTagliandiAssignModal } from "@/components/gestionale/mezzi/mezzi-tagliandi-assign-modal";
import { reportMetricCardCompactClass } from "@/components/report/report-ui-tokens";
import { buildMezziAnagraficaHubHref } from "@/lib/navigation/mezzi-tagliandi-links";
import { selectDashboardMaintenanceCards } from "@/lib/maintenance-plans/kpi/maintenance-kpi-selectors";
import { formatTriggerSummary } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import {
  groupOverviewByPreset,
  sortOverviewByNextDue,
} from "@/lib/maintenance-plans/resolve-mezzo-metering";
import {
  formatOverviewCurrentValue,
  formatOverviewGiornoPrevisto,
  formatOverviewUltimoData,
  formatOverviewValoreFatto,
  formatOverviewValorePrevisto,
} from "@/lib/maintenance-plans/tagliandi-overview-format";
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
  gestionaleListTableTdIdent,
  gestionaleListTableTdPill,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import {
  dsCardTitle,
  dsFocus,
  dsTableActionTextBtnPrimary,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  useMezziWithoutPresetQuery,
  useTagliandiOverviewQuery,
} from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

function cleanMezzoField(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t || t === "—" || t === "Non assegnata") return null;
  return t;
}

/** Scuderia / targa / matricola — omette i vuoti. */
function overviewIdentLines(row: {
  numeroScuderia: string | null;
  targa: string | null;
  matricola: string | null;
}): string[] {
  return [row.numeroScuderia, row.targa, row.matricola]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0 && v !== "—");
}

function OverviewStackCell({
  lines,
  className,
}: {
  lines: Array<string | null>;
  className?: string;
}) {
  const visible = lines.map((v) => (v ?? "").trim()).filter((v) => v.length > 0 && v !== "—");
  return (
    <td className={`${gestionaleListTableTd} min-w-0 ${className ?? ""}`.trim()}>
      {visible.length === 0 ? null : (
        <div className="flex min-w-0 flex-col gap-0.5">
          {visible.map((line, i) => (
            <span
              key={`${i}-${line}`}
              className={
                i === 0
                  ? "block truncate text-sm font-semibold leading-snug text-[color:var(--cab-text)]"
                  : "block truncate text-xs leading-snug text-[color:var(--cab-text-muted)]"
              }
            >
              {line}
            </span>
          ))}
        </div>
      )}
    </td>
  );
}

function OverviewIdentCell({
  numeroScuderia,
  targa,
  matricola,
  className,
}: {
  numeroScuderia: string | null;
  targa: string | null;
  matricola: string | null;
  className?: string;
}) {
  const lines = overviewIdentLines({ numeroScuderia, targa, matricola });
  return (
    <td className={`${gestionaleListTableTdIdent} ${className ?? ""}`.trim()}>
      {lines.length === 0 ? null : (
        <div className="flex min-w-0 flex-col gap-0.5">
          {lines.map((line, i) => (
            <span
              key={`${i}-${line}`}
              className="block truncate text-[13px] font-semibold leading-tight tabular-nums text-[color:var(--cab-text)]"
            >
              {line}
            </span>
          ))}
        </div>
      )}
    </td>
  );
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

function OverviewMetricStackCell({
  lines,
  className,
}: {
  lines: Array<string | null>;
  className?: string;
}) {
  const visible = lines.map((v) => (v ?? "").trim()).filter((v) => v.length > 0 && v !== "—");
  return (
    <td className={`${gestionaleListTableTdCenter} ${className ?? ""}`.trim()}>
      {visible.length === 0 ? (
        <span className="text-[color:var(--cab-text-muted)]">—</span>
      ) : (
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          {visible.map((line, i) => (
            <span
              key={`${i}-${line}`}
              className={
                i === 0
                  ? "block max-w-full truncate text-sm font-semibold leading-snug tabular-nums text-[color:var(--cab-text)]"
                  : "block max-w-full truncate text-xs font-semibold leading-snug tabular-nums text-[color:var(--cab-text)] opacity-80"
              }
            >
              {line}
            </span>
          ))}
        </div>
      )}
    </td>
  );
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
        colgroup={
          <>
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
          </>
        }
        headRow={
          <>
            <GlobalTableHeadLabel label="Cliente / cantiere / util." />
            <GlobalTableHeadLabel label="Oggetto" />
            <GlobalTableHeadLabel label="Scud. / targa / matr." align="center" />
            <GlobalTableHeadLabel label="Stato attuale" align="center" />
            <GlobalTableHeadLabel label="Ultimo tagliando" align="center" />
            <GlobalTableHeadLabel label="Prossimo tagliando" align="center" />
          </>
        }
      >
        {sorted.map((row) => {
          const stato = mapUrgencyToTagliandoStato(row.urgency);
          const highlighted = highlightConfigId === row.configId;
          const cellPad = "py-3.5";
          const attuale = formatOverviewCurrentValue(row);
          const ultimoData = formatOverviewUltimoData(row);
          const ultimoValore = formatOverviewValoreFatto(row);
          const prossimoData = formatOverviewGiornoPrevisto(row);
          const prossimoValore = formatOverviewValorePrevisto(row);
          return (
            <tr
              key={row.configId}
              className={`${gestionaleListTableRowBaseClass} ${TAGLIANDO_STATO_ROW_CLASS[stato]} cursor-pointer hover:bg-[var(--cab-hover)] ${highlighted ? "ring-2 ring-[var(--cab-primary)] ring-inset" : ""}`}
              onClick={() => onRowClick(row)}
              aria-label={`Apri mezzo ${row.cliente?.trim() || row.attrezzaturaLabel}`}
            >
              <OverviewStackCell
                lines={[row.cliente, row.cantiere, row.utilizzatore]}
                className={cellPad}
              />
              <OverviewStackCell
                lines={[row.attrezzaturaLabel, row.telaioLabel]}
                className={cellPad}
              />
              <OverviewIdentCell
                numeroScuderia={row.numeroScuderia}
                targa={row.targa}
                matricola={row.matricola}
                className={cellPad}
              />
              <td className={`${gestionaleListTableTdPill} ${cellPad}`}>
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <span className="text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                    {attuale}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TAGLIANDO_STATO_BADGE_CLASS[stato]}`}
                  >
                    {TAGLIANDO_STATO_LABELS[stato]}
                  </span>
                </div>
              </td>
              <OverviewMetricStackCell lines={[ultimoData, ultimoValore]} className={cellPad} />
              <OverviewMetricStackCell lines={[prossimoData, prossimoValore]} className={cellPad} />
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
  const mezziListQ = useMezziListQuery(undefined);
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

  const mezzoAnagraficaById = useMemo(() => {
    const map = new Map<
      string,
      {
        cliente: string | null;
        cantiere: string | null;
        utilizzatore: string | null;
        targa: string | null;
        matricola: string | null;
        numeroScuderia: string | null;
        attrezzaturaLabel: string | null;
        telaioLabel: string | null;
      }
    >();
    for (const m of mezziListQ.data ?? []) {
      const att = [m.marca, m.modello]
        .map((v) => (v ?? "").trim())
        .filter((v) => v.length > 0 && v !== "—")
        .join(" ");
      const telaio = [m.marcaTelaio, m.modelloTelaio]
        .map((v) => (v ?? "").trim())
        .filter((v) => v.length > 0 && v !== "—")
        .join(" ");
      map.set(m.id, {
        cliente: cleanMezzoField(m.cliente),
        cantiere: cleanMezzoField(m.cantiere),
        utilizzatore: cleanMezzoField(m.utilizzatore),
        targa: cleanMezzoField(m.targa),
        matricola: cleanMezzoField(m.matricola),
        numeroScuderia: cleanMezzoField(m.numeroScuderia),
        attrezzaturaLabel: att || null,
        telaioLabel: telaio || null,
      });
    }
    return map;
  }, [mezziListQ.data]);

  const allRows = useMemo(() => {
    return (overviewQ.data ?? []).map((row) => {
      const anag = mezzoAnagraficaById.get(row.mezzoId);
      if (!anag) return row;
      const attrezzaturaLabel =
        cleanMezzoField(row.attrezzaturaLabel) ?? anag.attrezzaturaLabel ?? row.attrezzaturaLabel;
      return {
        ...row,
        cliente: cleanMezzoField(row.cliente) ?? anag.cliente,
        cantiere: cleanMezzoField(row.cantiere) ?? anag.cantiere,
        utilizzatore: cleanMezzoField(row.utilizzatore) ?? anag.utilizzatore,
        targa: cleanMezzoField(row.targa) ?? anag.targa,
        matricola: cleanMezzoField(row.matricola) ?? anag.matricola,
        numeroScuderia: cleanMezzoField(row.numeroScuderia) ?? anag.numeroScuderia,
        attrezzaturaLabel: attrezzaturaLabel || "—",
        telaioLabel: cleanMezzoField(row.telaioLabel) ?? anag.telaioLabel,
      };
    });
  }, [overviewQ.data, mezzoAnagraficaById]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      const stato = mapUrgencyToTagliandoStato(r.urgency);
      if (localPresetFilter && r.presetId !== localPresetFilter) return false;
      if (!tagliandoStatoFilterMatches(stato, localStatoFilter)) return false;
      return true;
    });
  }, [allRows, localPresetFilter, localStatoFilter]);

  const groups = useMemo(() => groupOverviewByPreset(filtered), [filtered]);
  const kpi = useMemo(() => selectDashboardMaintenanceCards(filtered), [filtered]);
  const triggerByPreset = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plansQ.data ?? []) {
      const triggers = p.triggerGroups[0]?.triggers ?? [];
      const label =
        triggers.length > 0
          ? formatTriggerSummary(triggers)
          : `${p.intervalValue} ${p.intervalType}`;
      map.set(p.id, label);
    }
    return map;
  }, [plansQ.data]);

  const withoutRows = withoutQ.data ?? [];

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

  const hasContent = groups.length > 0 || withoutRows.length > 0;
  const emptyMessage =
    allRows.length === 0 && withoutRows.length === 0
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
            title={g.presetNome}
            subtitle={
              g.presetId
                ? `${g.rows.length} ${g.rows.length === 1 ? "mezzo" : "mezzi"} · ${triggerByPreset.get(g.presetId) ?? ""}`.trim()
                : `${g.rows.length} ${g.rows.length === 1 ? "mezzo" : "mezzi"}`
            }
            rows={g.rows}
            highlightConfigId={highlightConfigId}
            onRowClick={onRowClick}
          />
        ))}
        <WithoutPresetGroup
          rows={withoutRows}
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
