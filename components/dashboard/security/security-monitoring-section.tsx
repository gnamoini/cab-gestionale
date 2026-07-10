"use client";

import { Tooltip } from "@/components/ui";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { listRecentSecurityAuditAction } from "@/src/actions/security-read";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AuthLogWithProfileRow, LogModificaRow } from "@/src/types/supabase-tables";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  dsBtnDanger,
  dsPageToolbarBtn,
  dsPageToolbarMetaActionBtn,
  dsScrollbar,
  dsSectionTitle,
  dsSurfaceInteractiveKpi,
  dsTable,
  dsTableEmptyCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
} from "@/lib/ui/design-system";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { logModificaDetailLine } from "@/lib/gestionale-log/log-modifiche-view-model";

export type RecentActivityRow = {
  id: string;
  source: "audit";
  action: string;
  entita: string;
  when: string;
  actor: string;
  detail: string;
};

export type SecurityMonitoringRange = { dateFromYmd: string; dateToYmd: string };

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function truncateUa(ua: string | null, max = 72): string {
  if (!ua) return "—";
  const t = ua.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function LogTable({ rows, columns }: { rows: AuthLogWithProfileRow[]; columns: "login" | "failed" }) {
  if (rows.length === 0) {
    return (
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={dsTable}>
          <tbody>
            <tr>
              <td className={dsTableEmptyCell}>Nessun record nel periodo selezionato.</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className={`${dsTableWrap} max-h-[min(28rem,55vh)] ${dsScrollbar}`}>
      <table className={`${dsTable} text-xs`}>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="Data/ora" />
          {columns === "login" ? <GlobalTableHeadLabel label="Utente" /> : null}
          <GlobalTableHeadLabel label="Email" />
          {columns === "failed" ? <GlobalTableHeadLabel label="User agent" /> : <GlobalTableHeadLabel label="Azione" />}
        </GlobalTableHead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={dsTableRow}>
              <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtWhen(r.created_at)}</td>
              {columns === "login" ? <td className={dsTableTd}>{r.profiles?.nome?.trim() || "—"}</td> : null}
              <td className={dsTableTd}>{r.email}</td>
              {columns === "failed" ? (
                <Tooltip content={r.user_agent ?? ""}><td className={`${dsTableTd} max-w-[20rem] truncate`}>
                  {truncateUa(r.user_agent)}
                </td></Tooltip>
              ) : (
                <td className={dsTableTd}>{r.action}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LastAccessTable({
  rows,
}: {
  rows: { userId: string; nome: string; email: string; lastAt: string; lastAction: string }[];
}) {
  if (rows.length === 0) {
    return (
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={dsTable}>
          <tbody>
            <tr>
              <td className={dsTableEmptyCell}>Nessun accesso con utente associato nel periodo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className={`${dsTableWrap} max-h-[min(28rem,55vh)] ${dsScrollbar}`}>
      <table className={`${dsTable} text-xs`}>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="Utente" />
          <GlobalTableHeadLabel label="Email log" />
          <GlobalTableHeadLabel label="Ultimo evento" />
          <GlobalTableHeadLabel label="Azione" />
        </GlobalTableHead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={dsTableRow}>
              <td className={dsTableTd}>{r.nome}</td>
              <td className={dsTableTd}>{r.email}</td>
              <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtWhen(r.lastAt)}</td>
              <td className={dsTableTd}>{r.lastAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function useRecentSystemActivity(enabled: boolean) {
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: [...QK.log, "security-recent"],
    enabled,
    ...securityOpts,
    queryFn: async (): Promise<
      Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>
    > => {
      const res = await listRecentSecurityAuditAction();
      if (!res.ok) throw new Error(res.message);
      return res.rows as Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>;
    },
  });
}

export function useRecentActivityRows(
  recentActivityQ: ReturnType<typeof useRecentSystemActivity>,
  statiLavorazione: StatoLavorazioneConfig[],
): RecentActivityRow[] {
  return useMemo((): RecentActivityRow[] => {
    return (recentActivityQ.data ?? []).map((r) => ({
      id: `audit-${r.id}`,
      source: "audit",
      action: r.azione,
      entita: r.entita,
      when: r.created_at,
      actor: r.profiles?.nome?.trim() || "—",
      detail: logModificaDetailLine(r, statiLavorazione),
    }));
  }, [recentActivityQ.data, statiLavorazione]);
}

export type SecurityMonitoringSectionProps = {
  range: SecurityMonitoringRange;
  onRangeChange: (range: SecurityMonitoringRange) => void;
  onResetRange: () => void;
  filterUserId: string | null;
  onFilterUserIdChange: (userId: string | null) => void;
  filterUserItems: { value: string; label: string }[];
  usersLoading: boolean;
  logsQuery: UseQueryResult<AuthLogWithProfileRow[], Error>;
  recentActivityQ: ReturnType<typeof useRecentSystemActivity>;
  recentActivityRows: RecentActivityRow[];
  recentLogins: AuthLogWithProfileRow[];
  recentLoginFailed: AuthLogWithProfileRow[];
  activeTodayCount: number;
  activeTodayRows: { id: string; nome: string }[];
  lastAccessPerUser: { userId: string; nome: string; email: string; lastAt: string; lastAction: string }[];
  failedNote: string;
  resettingLogs: boolean;
  onRefresh: () => void;
  onResetChangeLogs: () => void;
};

export function SecurityMonitoringSection({
  range,
  onRangeChange,
  onResetRange,
  filterUserId,
  onFilterUserIdChange,
  filterUserItems,
  usersLoading,
  logsQuery,
  recentActivityQ,
  recentActivityRows,
  recentLogins,
  recentLoginFailed,
  activeTodayCount,
  activeTodayRows,
  lastAccessPerUser,
  failedNote,
  resettingLogs,
  onRefresh,
  onResetChangeLogs,
}: SecurityMonitoringSectionProps) {
  return (
    <div id="security-panel-monitoring" role="tabpanel" aria-labelledby="security-tab-monitoring" className="space-y-4">
      <div className={gestionalePageToolbarActionsClass}>
        <button
          type="button"
          className={dsPageToolbarBtn}
          onClick={onRefresh}
          disabled={logsQuery.isFetching || recentActivityQ.isFetching}
        >
          {logsQuery.isFetching || recentActivityQ.isFetching ? "Aggiornamento…" : "Aggiorna dati"}
        </button>
        <button type="button" className={dsBtnDanger} onClick={onResetChangeLogs} disabled={resettingLogs}>
          {resettingLogs ? "Reset…" : "Resetta log modifiche"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={dsSurfaceInteractiveKpi}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Attivi oggi</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--cab-text)]">{activeTodayCount}</p>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Utenti distinti con login o logout nella giornata locale.</p>
        </div>
        <div className={dsSurfaceInteractiveKpi}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Login (periodo)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--cab-text)]">{recentLogins.length}</p>
        </div>
        <div className={dsSurfaceInteractiveKpi}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Falliti (periodo)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--cab-text)]">{recentLoginFailed.length}</p>
        </div>
        <div className={dsSurfaceInteractiveKpi}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Righe caricate</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--cab-text)]">{logsQuery.data?.length ?? 0}</p>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Max 2500 eventi, ordinati dal più recente.</p>
        </div>
      </div>

      <ShellCard title="Ultime azioni / modifiche" subtitle="Ultimi 50 eventi dal registro audit del sistema.">
        {recentActivityQ.isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento audit…</p>
        ) : recentActivityQ.isError ? (
          <p className="text-sm text-[color:var(--cab-danger)]">{recentActivityQ.error.message}</p>
        ) : recentActivityRows.length === 0 ? (
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className={dsTable}>
              <tbody>
                <tr>
                  <td className={dsTableEmptyCell}>Nessuna modifica registrata.</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`${dsTableWrap} max-h-[min(28rem,55vh)] ${dsScrollbar}`}>
            <table className={`${dsTable} text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Data/ora" />
                <GlobalTableHeadLabel label="Entità" />
                <GlobalTableHeadLabel label="Azione" />
                <GlobalTableHeadLabel label="Responsabile" />
                <GlobalTableHeadLabel label="Dettaglio" />
              </GlobalTableHead>
              <tbody>
                {recentActivityRows.map((row) => (
                  <tr key={row.id} className={dsTableRow}>
                    <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtWhen(row.when)}</td>
                    <td className={dsTableTd}>{row.entita}</td>
                    <td className={dsTableTd}>{row.action}</td>
                    <td className={dsTableTd}>{row.actor}</td>
                    <Tooltip content={row.detail}><td className={`${dsTableTd} max-w-[24rem] truncate`}>
                      {row.detail}
                    </td></Tooltip>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ShellCard>

      <ShellCard title="Filtri">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <label className="block min-w-0">
              <span className={dsSectionTitle}>Da data</span>
              <div className="mt-1">
                <GlobalDatePickerYmd
                  valueYmd={range.dateFromYmd}
                  onChangeYmd={(ymd) => onRangeChange({ ...range, dateFromYmd: ymd })}
                  variant="default"
                  aria-label="Da data"
                />
              </div>
            </label>
            <label className="block min-w-0">
              <span className={dsSectionTitle}>A data</span>
              <div className="mt-1">
                <GlobalDatePickerYmd
                  valueYmd={range.dateToYmd}
                  onChangeYmd={(ymd) => onRangeChange({ ...range, dateToYmd: ymd })}
                  variant="default"
                  aria-label="A data"
                />
              </div>
            </label>
          </div>
          <label className="block min-w-0 flex-1 lg:max-w-xs">
            <span className={dsSectionTitle}>Utente</span>
            <div className="mt-1">
              <GlobalSelect
                variant="filter"
                value={filterUserId ?? ""}
                onChange={(id) => onFilterUserIdChange(id || null)}
                disabled={usersLoading}
                isLoading={usersLoading}
                selectorDomain="security"
                dynamicList
                operationalFilter
                recentsKey="selector:security-audit-users"
                aria-label="Filtra per utente"
                items={filterUserItems}
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={dsPageToolbarMetaActionBtn} onClick={onResetRange}>
              Reimposta filtri
            </button>
          </div>
        </div>
        {logsQuery.isError ? (
          <p className="mt-3 text-sm text-[color:var(--cab-danger)]">
            {logsQuery.error instanceof Error ? logsQuery.error.message : "Errore caricamento log."}
          </p>
        ) : null}
      </ShellCard>

      <ShellCard title="Utenti attivi oggi" subtitle="Utenti con almeno un login o logout nella giornata corrente (fuso locale del browser).">
        {activeTodayRows.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun utente registrato come attivo oggi nei log caricati.</p>
        ) : (
          <div className={`${dsTableWrap} max-h-[min(16rem,40vh)] ${dsScrollbar}`}>
            <table className={`${dsTable} text-xs`}>
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Nome" />
                <GlobalTableHeadLabel label="Id profilo" />
              </GlobalTableHead>
              <tbody>
                {activeTodayRows.map((r) => (
                  <tr key={r.id} className={dsTableRow}>
                    <td className={dsTableTd}>{r.nome}</td>
                    <td className={`${dsTableTd} font-mono text-[10px]`}>{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ShellCard>

      <ShellCard title="Ultimi login" subtitle="Eventi con azione login nel periodo (max 2500 righe totali dalla query).">
        <LogTable rows={recentLogins} columns="login" />
      </ShellCard>

      <ShellCard title="Login falliti" subtitle={failedNote}>
        <LogTable rows={recentLoginFailed} columns="failed" />
      </ShellCard>

      <ShellCard title="Ultimo accesso per utente" subtitle="Per ogni user_id: ultimo login o logout nel periodo filtrato.">
        <LastAccessTable rows={lastAccessPerUser} />
      </ShellCard>
    </div>
  );
}
