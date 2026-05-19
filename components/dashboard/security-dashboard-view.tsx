"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { APP_ROLES, roleLabel, type AppRole } from "@/src/lib/auth/permissions";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { SecurityCreateUserModal } from "@/components/dashboard/security-create-user-modal";
import { ClientLavorazioniAccessPanel } from "@/components/dashboard/client-lavorazioni-access-panel";
import { Drawer } from "@/components/design-system";
import {
  listUsersByAdminAction,
  resetGlobalChangeLogsByAdminAction,
  updateUserRoleByAdminAction,
  type SecurityUserAdminRow,
} from "@/src/actions/admin-users";
import {
  dsBtnGhost,
  dsBtnDanger,
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsPageToolbarBtn,
  dsScrollbar,
  dsSectionTitle,
  dsStackPage,
  dsStickyToolbar,
  dsSurfaceInteractiveKpi,
  dsTable,
  dsTableEmptyCell,
  dsTableHeadCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useSecurityDashboardData, useSecurityProfilesQuery } from "@/src/hooks/use-security-dashboard-data";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AuthLogWithProfileRow, LogModificaRow } from "@/src/types/supabase-tables";

type UserSortKey = "nome" | "lastSignInAt";

type UserActivityRow =
  | {
      id: string;
      source: "audit";
      action: string;
      entita: string;
      when: string;
      actor: string;
      detail: string;
    }
  | {
      id: string;
      source: "auth";
      action: string;
      entita: string;
      when: string;
      actor: string;
      detail: string;
    };

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

function roleToneClass(role: AppRole): string {
  if (role === "admin") return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/35 dark:text-red-200 dark:ring-red-900/60";
  if (role === "operatore") return "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-200 dark:ring-orange-900/60";
  return "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700";
}

function fmtNullableWhen(iso: string | null): string {
  return iso ? fmtWhen(iso) : "—";
}

function payloadDetail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const o = payload as Record<string, unknown>;
  if (typeof o.compact === "string") return o.compact;
  if (typeof o.event === "string") return o.event;
  if ("before" in o || "after" in o) return "Modifica dati";
  if ("snapshot" in o) return "Snapshot record";
  return "Evento registrato";
}

function UserRoleBadge({ role }: { role: AppRole }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${roleToneClass(role)}`}>
      {roleLabel(role)}
    </span>
  );
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

function useSecurityUsers(enabled: boolean) {
  return useQuery({
    queryKey: QK.securityUsers,
    enabled,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await listUsersByAdminAction();
      if (!res.ok) throw new Error(res.message);
      return res.users;
    },
  });
}

function useUserActivity(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...QK.log, "user-activity", userId ?? "none"],
    enabled: enabled && !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<UserActivityRow[]> => {
      if (!userId) return [];
      const sb = getBrowserSupabase();
      const [audit, auth] = await Promise.all([
        sb
          .from("log_modifiche")
          .select("*, profiles!log_modifiche_autore_id_fkey(id,nome)")
          .eq("autore_id", userId)
          .order("created_at", { ascending: false })
          .limit(35),
        sb
          .from("auth_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (audit.error) throw new Error(audit.error.message);
      if (auth.error) throw new Error(auth.error.message);
      const auditRows = ((audit.data ?? []) as Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>).map(
        (r): UserActivityRow => ({
          id: `audit-${r.id}`,
          source: "audit",
          action: r.azione,
          entita: r.entita,
          when: r.created_at,
          actor: r.profiles?.nome?.trim() || "—",
          detail: payloadDetail(r.payload),
        }),
      );
      const authRows = ((auth.data ?? []) as AuthLogWithProfileRow[]).map(
        (r): UserActivityRow => ({
          id: `auth-${r.id}`,
          source: "auth",
          action: r.action.toUpperCase(),
          entita: "auth",
          when: r.created_at,
          actor: r.email,
          detail: r.action === "login" ? "Login" : r.action === "logout" ? "Logout" : "Login fallito",
        }),
      );
      return [...auditRows, ...authRows].sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, 50);
    },
  });
}

function useRecentSystemActivity(enabled: boolean) {
  return useQuery({
    queryKey: [...QK.log, "security-recent"],
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<UserActivityRow[]> => {
      const sb = getBrowserSupabase();
      const { data, error } = await sb
        .from("log_modifiche")
        .select("*, profiles!log_modifiche_autore_id_fkey(id,nome)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<LogModificaRow & { profiles?: { nome?: string | null } | null }>).map((r) => ({
        id: `audit-${r.id}`,
        source: "audit",
        action: r.azione,
        entita: r.entita,
        when: r.created_at,
        actor: r.profiles?.nome?.trim() || "—",
        detail: payloadDetail(r.payload),
      }));
    },
  });
}

function UserDetailDrawer({
  user,
  open,
  onClose,
}: {
  user: SecurityUserAdminRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const activityQ = useUserActivity(user?.id ?? null, open && !!user);

  return (
    <Drawer open={open && !!user} onClose={onClose} title="Scheda utente" ariaLabel="Scheda utente">
      {!user ? null : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[color:var(--cab-text)]">{user.nome}</h3>
                <p className="mt-0.5 truncate text-xs text-[color:var(--cab-text-muted)]">{user.email || "Email non disponibile"}</p>
              </div>
              <UserRoleBadge role={user.ruolo} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Creato</dt>
                <dd className="text-right tabular-nums text-[color:var(--cab-text)]">{fmtNullableWhen(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Ultimo accesso</dt>
                <dd className="text-right tabular-nums text-[color:var(--cab-text)]">{fmtNullableWhen(user.lastSignInAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--cab-text-muted)]">Id profilo</dt>
                <dd className="max-w-[12rem] truncate text-right font-mono text-[10px] text-[color:var(--cab-text)]">{user.id}</dd>
              </div>
            </dl>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
            <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Ultime azioni / modifiche</h3>
            </div>
            <div className="gestionale-scrollbar max-h-[min(62dvh,34rem)] overflow-y-auto">
              {activityQ.isLoading ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
              ) : activityQ.isError ? (
                <p className="p-3 text-sm text-[color:var(--cab-danger)]">{activityQ.error.message}</p>
              ) : (activityQ.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--cab-text-muted)]">Nessuna attività recente.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--cab-border)]">
                  {(activityQ.data ?? []).map((row) => (
                    <li key={row.id} className="px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--cab-text)]">{row.action}</span>
                        <span className="tabular-nums text-[color:var(--cab-text-muted)]">{fmtWhen(row.when)}</span>
                      </div>
                      <p className="mt-1 text-[color:var(--cab-text-muted)]">
                        {row.entita} · {row.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function SecurityDashboardView() {
  const { user, refresh } = useAuth();
  const permissions = usePermissions();
  const isAdmin = permissions.canManageSecurity;
  const securityAccessLoggedRef = useRef(false);
  const [range, setRange] = useState(defaultRange);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [userSort, setUserSort] = useState<UserSortKey>("nome");
  const [realtime, setRealtime] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [resettingLogs, setResettingLogs] = useState(false);
  const queryClient = useQueryClient();

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
  const usersQ = useSecurityUsers(!!isAdmin);
  const recentActivityQ = useRecentSystemActivity(!!isAdmin);

  const filteredUsers = useMemo(() => {
    const base = usersQ.data ?? [];
    const filtered = roleFilter === "all" ? base : base.filter((u) => u.ruolo === roleFilter);
    return [...filtered].sort((a, b) => {
      if (userSort === "lastSignInAt") {
        const av = a.lastSignInAt ?? "";
        const bv = b.lastSignInAt ?? "";
        if (av !== bv) return av < bv ? 1 : -1;
      }
      return a.nome.localeCompare(b.nome, "it");
    });
  }, [usersQ.data, roleFilter, userSort]);
  const {
    page: usersPage,
    setPage: setUsersPage,
    pageCount: usersPageCount,
    sliceItems: sliceUsers,
    showPager: showUsersPager,
    label: usersPagerLabel,
    resetPage: resetUsersPage,
  } = useClientPagination(filteredUsers.length, 12);
  const pagedUsers = useMemo(() => sliceUsers(filteredUsers), [filteredUsers, sliceUsers]);
  const selectedUser = useMemo(
    () => (usersQ.data ?? []).find((u) => u.id === selectedUserId) ?? null,
    [usersQ.data, selectedUserId],
  );

  useEffect(() => {
    resetUsersPage();
  }, [roleFilter, userSort, usersQ.data?.length, resetUsersPage]);

  async function handleRoleChange(target: SecurityUserAdminRow, role: AppRole) {
    if (target.ruolo === role) return;
    const res = await updateUserRoleByAdminAction({ userId: target.id, role });
    if (!res.ok) {
      window.alert(res.message);
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QK.securityUsers }),
      queryClient.invalidateQueries({ queryKey: QK.authUsers }),
      queryClient.invalidateQueries({ queryKey: QK.profiles }),
      queryClient.invalidateQueries({ queryKey: QK.log }),
      queryClient.invalidateQueries({ queryKey: QK.userPermissions }),
    ]);
    if (target.id === user?.id) {
      await refresh();
    }
  }

  async function handleResetChangeLogs() {
    if (!window.confirm("Resettare il log modifiche globale? L'azione è irreversibile e non elimina utenti o dati operativi.")) return;
    setResettingLogs(true);
    try {
      const res = await resetGlobalChangeLogsByAdminAction();
      if (!res.ok) {
        window.alert(res.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.log }),
        recentActivityQ.refetch(),
        logsQuery.refetch(),
      ]);
      window.alert(`Log modifiche resettato. Righe rimosse: ${res.deletedCount ?? "n/d"}.`);
    } finally {
      setResettingLogs(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !user?.id || securityAccessLoggedRef.current) return;
    securityAccessLoggedRef.current = true;
    void (async () => {
      try {
        const sb = getBrowserSupabase();
        await sb.from("log_modifiche").insert({
          entita: "security",
          entita_id: user.id,
          azione: "ACCESS_SECURITY",
          autore_id: user.id,
          payload: { event: "ACCESSO SICUREZZA", user: user.nome },
        });
      } catch {
        /* audit best effort */
      }
    })();
  }, [isAdmin, user?.id, user?.nome]);

  const { logsQuery, recentLogins, recentLoginFailed, activeTodayCount, activeTodayIds, lastAccessPerUser } = dash;

  const activeTodayRows = useMemo(() => {
    const pmap = new Map((profilesQ.data ?? []).map((p) => [p.id, p.nome]));
    return activeTodayIds
      .map((id) => ({ id, nome: pmap.get(id)?.trim() || "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [activeTodayIds, profilesQ.data]);

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
            <button type="button" className={dsBtnDanger} onClick={() => void handleResetChangeLogs()} disabled={resettingLogs}>
              {resettingLogs ? "Reset…" : "Resetta log modifiche"}
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

      <SecurityCreateUserModal open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
      <UserDetailDrawer user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUserId(null)} />

      <ClientLavorazioniAccessPanel />

      <ShellCard title="Utenti registrati">
        <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" className={`h-11 shrink-0 ${dsBtnPrimary}`} onClick={() => setCreateUserOpen(true)}>
              Nuovo utente
            </button>
            <label className="block min-w-[12rem]">
              <span className={dsSectionTitle}>Ruolo</span>
              <select
                className={`${gestionaleSelectNativePlainClass} mt-1 w-full`}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | AppRole)}
              >
                <option value="all">Tutti i ruoli</option>
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[12rem]">
              <span className={dsSectionTitle}>Ordina per</span>
              <select className={`${gestionaleSelectNativePlainClass} mt-1 w-full`} value={userSort} onChange={(e) => setUserSort(e.target.value as UserSortKey)}>
                <option value="nome">Nome</option>
                <option value="lastSignInAt">Ultimo accesso</option>
              </select>
            </label>
            <button type="button" className={`${dsPageToolbarBtn} h-11 sm:ml-auto`} onClick={() => void usersQ.refetch()} disabled={usersQ.isFetching}>
              {usersQ.isFetching ? "Aggiornamento…" : "Aggiorna utenti"}
            </button>
          </div>
          <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{filteredUsers.length}</span>
                <span>utent{filteredUsers.length === 1 ? "e" : "i"}</span>
              </span>
              {roleFilter !== "all" ? (
                <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                  Filtri attivi
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button type="button" className={dsPageToolbarBtn} onClick={() => setRoleFilter("all")}>
                Reimposta filtri
              </button>
            </div>
          </div>
        </div>
        </div>

        {usersQ.isError ? (
          <p className="mt-4 text-sm text-[color:var(--cab-danger)]">{usersQ.error.message}</p>
        ) : usersQ.isLoading ? (
          <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento utenti…</p>
        ) : filteredUsers.length === 0 ? (
          <div className={`mt-4 ${dsTableWrap} ${dsScrollbar}`}>
            <table className={dsTable}>
              <tbody>
                <tr>
                  <td className={dsTableEmptyCell}>Nessun utente trovato.</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className={`mt-4 ${dsTableWrap} max-h-[min(32rem,64vh)] ${dsScrollbar}`}>
              <table className={`${dsTable} text-xs`}>
                <thead>
                  <tr>
                    <th className={dsTableHeadCell}>Nome</th>
                    <th className={dsTableHeadCell}>Email</th>
                    <th className={dsTableHeadCell}>Ruolo</th>
                    <th className={dsTableHeadCell}>Creato</th>
                    <th className={dsTableHeadCell}>Ultimo accesso</th>
                    <th className={dsTableHeadCell}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((row) => (
                    <tr key={row.id} className={dsTableRow}>
                      <td className={`${dsTableTd} font-medium text-[color:var(--cab-text)]`}>{row.nome}</td>
                      <td className={dsTableTd}>{row.email || "—"}</td>
                      <td className={dsTableTd}>
                        <select
                          className={`${gestionaleSelectNativePlainClass} min-w-[8rem] py-1 text-xs`}
                          value={row.ruolo}
                          onChange={(e) => void handleRoleChange(row, e.target.value as AppRole)}
                          aria-label={`Cambia ruolo ${row.nome}`}
                        >
                          {APP_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtNullableWhen(row.createdAt)}</td>
                      <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtNullableWhen(row.lastSignInAt)}</td>
                      <td className={dsTableTd}>
                        <button type="button" className={dsBtnGhost} onClick={() => setSelectedUserId(row.id)}>
                          Dettaglio
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showUsersPager ? (
              <TablePagination page={usersPage} pageCount={usersPageCount} onPageChange={setUsersPage} label={usersPagerLabel} />
            ) : null}
          </>
        )}
      </ShellCard>

      <ShellCard title="Ultime azioni / modifiche" subtitle="Ultimi 50 eventi dal registro audit del sistema.">
        {recentActivityQ.isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento audit…</p>
        ) : recentActivityQ.isError ? (
          <p className="text-sm text-[color:var(--cab-danger)]">{recentActivityQ.error.message}</p>
        ) : (recentActivityQ.data ?? []).length === 0 ? (
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
              <thead>
                <tr>
                  <th className={dsTableHeadCell}>Data/ora</th>
                  <th className={dsTableHeadCell}>Entità</th>
                  <th className={dsTableHeadCell}>Azione</th>
                  <th className={dsTableHeadCell}>Responsabile</th>
                  <th className={dsTableHeadCell}>Dettaglio</th>
                </tr>
              </thead>
              <tbody>
                {(recentActivityQ.data ?? []).map((row) => (
                  <tr key={row.id} className={dsTableRow}>
                    <td className={`${dsTableTd} whitespace-nowrap tabular-nums`}>{fmtWhen(row.when)}</td>
                    <td className={dsTableTd}>{row.entita}</td>
                    <td className={dsTableTd}>{row.action}</td>
                    <td className={dsTableTd}>{row.actor}</td>
                    <td className={`${dsTableTd} max-w-[24rem] truncate`} title={row.detail}>
                      {row.detail}
                    </td>
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
                  {p.nome} ({roleLabel(p.ruolo)})
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
