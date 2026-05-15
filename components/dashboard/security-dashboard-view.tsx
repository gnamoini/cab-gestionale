"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityCreateUserModal } from "@/components/dashboard/security-create-user-modal";
import {
  dsBtnGhost,
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsPageToolbarBtn,
  dsScrollbar,
  dsSectionTitle,
  dsStackPage,
  dsSurfaceInteractiveKpi,
  dsTable,
  dsTableEmptyCell,
  dsTableHeadCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";
import { useSecurityDashboardData, useSecurityProfilesQuery } from "@/src/hooks/use-security-dashboard-data";
import type { AuthLogWithProfileRow } from "@/src/types/supabase-tables";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultRange(): { dateFromYmd: string; dateToYmd: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 30);
  return { dateFromYmd: fmtYmd(from), dateToYmd: fmtYmd(to) };
}

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
        <thead>
          <tr>
            <th className={dsTableHeadCell}>Data/ora</th>
            {columns === "login" ? <th className={dsTableHeadCell}>Utente</th> : null}
            <th className={dsTableHeadCell}>Email</th>
            {columns === "failed" ? <th className={dsTableHeadCell}>User agent</th> : <th className={dsTableHeadCell}>Azione</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={dsTableRow}>
              <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtWhen(r.created_at)}</td>
              {columns === "login" ? (
                <td className={dsTableTd}>{r.profiles?.nome?.trim() || "—"}</td>
              ) : null}
              <td className={dsTableTd}>{r.email}</td>
              {columns === "failed" ? (
                <td className={`${dsTableTd} max-w-[20rem] truncate`} title={r.user_agent ?? ""}>
                  {truncateUa(r.user_agent)}
                </td>
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
        <thead>
          <tr>
            <th className={dsTableHeadCell}>Utente</th>
            <th className={dsTableHeadCell}>Email log</th>
            <th className={dsTableHeadCell}>Ultimo evento</th>
            <th className={dsTableHeadCell}>Azione</th>
          </tr>
        </thead>
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

export function SecurityDashboardView() {
  const { user } = useAuth();
  const isAdmin = user?.ruolo === "admin";
  const [range, setRange] = useState(defaultRange);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const filters = useMemo(
    () => ({
      dateFromYmd: range.dateFromYmd,
      dateToYmd: range.dateToYmd,
      filterUserId,
    }),
    [range.dateFromYmd, range.dateToYmd, filterUserId],
  );

  const profilesQ = useSecurityProfilesQuery(!!isAdmin);
  const dash = useSecurityDashboardData(filters, { realtime });

  if (!isAdmin) {
    return (
      <div className={dsStackPage}>
        <PageHeader title="Sicurezza" description="Monitoraggio accessi e autenticazioni." />
        <ShellCard title="Accesso negato">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Questa area è riservata agli utenti con ruolo <strong className="text-[color:var(--cab-text)]">admin</strong> su{" "}
            <code className="rounded bg-[var(--cab-surface-2)] px-1">profiles</code> (allineato a RLS e permessi sistema). I permessi
            granulari <code className="rounded bg-[var(--cab-surface-2)] px-1">user_permissions</code> non estendono la visibilità dei log
            di autenticazione agli altri ruoli.
          </p>
          <Link href="/dashboard" className={`mt-4 inline-flex ${dsBtnNeutral}`}>
            Torna alla dashboard
          </Link>
        </ShellCard>
      </div>
    );
  }

  const { logsQuery, recentLogins, recentLoginFailed, activeTodayCount, activeTodayIds, lastAccessPerUser } = dash;

  const activeTodayRows = useMemo(() => {
    const pmap = new Map((profilesQ.data ?? []).map((p) => [p.id, p.nome]));
    return activeTodayIds
      .map((id) => ({ id, nome: pmap.get(id)?.trim() || "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [activeTodayIds, profilesQ.data]);
  const failedNote =
    filterUserId != null
      ? "Con filtro utente attivo, i tentativi falliti non sono limitati per utente (nessun user_id nei log falliti): in questa sezione possono non comparire righe."
      : "Tentativi di accesso con credenziali errate (nessun profilo associato).";

  return (
    <div className={dsStackPage}>
      <PageHeader
        title="Sicurezza"
        description="Login, logout, tentativi falliti e ultimo accesso per utente. Dati da auth_logs con join profili."
        actions={
          <>
            <button type="button" className={dsPageToolbarBtn} onClick={() => void logsQuery.refetch()} disabled={logsQuery.isFetching}>
              {logsQuery.isFetching ? "Aggiornamento…" : "Aggiorna"}
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-xs font-medium text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[color:var(--cab-border-strong)]"
                checked={realtime}
                onChange={(e) => setRealtime(e.target.checked)}
              />
              Live (Realtime)
            </label>
          </>
        }
      />

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

      <ShellCard
        title="Gestione utenti"
        subtitle="Creazione centralizzata (Supabase Auth + profilo). Richiede variabile server SUPABASE_SERVICE_ROLE_KEY; nessun segreto nel browser."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-[color:var(--cab-text-muted)]">
            Aggiungi un account con nome, email, password e ruolo su <code className="rounded bg-[var(--cab-surface-2)] px-1">profiles</code>.
            Dopo la creazione puoi affinare i permessi per modulo dalla gestione permessi.
          </p>
          <button type="button" className={`shrink-0 ${dsBtnPrimary}`} onClick={() => setCreateUserOpen(true)}>
            Nuovo utente
          </button>
        </div>
      </ShellCard>

      <SecurityCreateUserModal open={createUserOpen} onClose={() => setCreateUserOpen(false)} />

      <ShellCard title="Filtri">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <label className="block min-w-0">
              <span className={dsSectionTitle}>Da data</span>
              <input
                type="date"
                className={`${dsInput} mt-1`}
                value={range.dateFromYmd}
                onChange={(e) => setRange((r) => ({ ...r, dateFromYmd: e.target.value }))}
              />
            </label>
            <label className="block min-w-0">
              <span className={dsSectionTitle}>A data</span>
              <input
                type="date"
                className={`${dsInput} mt-1`}
                value={range.dateToYmd}
                onChange={(e) => setRange((r) => ({ ...r, dateToYmd: e.target.value }))}
              />
            </label>
          </div>
          <label className="block min-w-[12rem] flex-1 lg:max-w-xs">
            <span className={dsSectionTitle}>Utente</span>
            <select
              className={`${gestionaleSelectNativePlainClass} mt-1 w-full`}
              value={filterUserId ?? ""}
              onChange={(e) => setFilterUserId(e.target.value || null)}
              disabled={profilesQ.isPending}
            >
              <option value="">Tutti gli utenti</option>
              {(profilesQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.ruolo})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={dsBtnGhost}
              onClick={() => {
                setRange(defaultRange());
                setFilterUserId(null);
              }}
            >
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
              <thead>
                <tr>
                  <th className={dsTableHeadCell}>Nome</th>
                  <th className={dsTableHeadCell}>Id profilo</th>
                </tr>
              </thead>
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
