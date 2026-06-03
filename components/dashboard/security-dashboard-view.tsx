"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { roleLabel } from "@/src/lib/auth/permissions";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { PageHeader } from "@/components/gestionale/page-header";
import { gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SecurityUsersPermissionsPanel } from "@/components/dashboard/security/security-users-permissions-panel";
import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import { Drawer, LoadingFormSkeleton } from "@/components/design-system";
import {
  type SecurityUserPermissionRow,
} from "@/src/actions/security-users-permissions";
import { resetGlobalChangeLogsByAdminAction } from "@/src/actions/admin-users";
import { useSecurityUsersPermissionsQuery } from "@/src/hooks/use-security-users-permissions-query";
import {
  dsBtnDanger,
  dsBtnGhost,
  dsBtnNeutral,
  dsInput,
  dsPageToolbarBtn,
  dsScrollbar,
  dsSectionTitle,
  dsStackPage,
  dsSurfaceInteractiveKpi,
  dsTable,
  dsTableEmptyCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { useSecurityDashboardData, useSecurityProfilesQuery } from "@/src/hooks/use-security-dashboard-data";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AuthLogWithProfileRow, LogModificaRow } from "@/src/types/supabase-tables";
import {
  runSecurityReleaseControlAction,
  setPilotDbOverrideAction,
  type ChecklistItem,
  type PilotControlStatus,
} from "@/src/actions/security-release-control";

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

function findingTone(category: string): "danger" | "warning" | "neutral" {
  if (category === "security" || category === "storage" || category === "rbac" || category === "feature-flag") return "danger";
  if (category === "database" || category === "ux") return "warning";
  return "neutral";
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

function useUserActivity(userId: string | null, enabled: boolean) {
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: [...QK.log, "user-activity", userId ?? "none"],
    enabled: enabled && !!userId,
    ...securityOpts,
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
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: [...QK.log, "security-recent"],
    enabled,
    ...securityOpts,
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
  user: SecurityUserPermissionRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const activityQ = useUserActivity(user?.id ?? null, open && !!user);

  return (
    <Drawer open={open && !!user} onClose={onClose} title="Scheda utente" ariaLabel="Scheda utente">
      {!user ? null : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[color:var(--cab-text)]">{user.nome}</h3>
                <p className="mt-0.5 truncate text-xs text-[color:var(--cab-text-muted)]">{user.email || "Email non disponibile"}</p>
              </div>
              <SecurityRoleBadge role={user.ruolo} />
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

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
            <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Ultime azioni / modifiche</h3>
            </div>
            <div className="gestionale-scrollbar max-h-[min(62dvh,34rem)] overflow-y-auto">
              {activityQ.isLoading ? (
                <div className="p-3" aria-busy="true" role="status" aria-label="Caricamento attività">
                  <LoadingFormSkeleton fields={4} />
                </div>
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
  const { user } = useAuth();
  const permissions = usePermissions();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const gestToast = useGestionaleToast();
  const isAdmin = permissions.canManageSecurity;
  const securityAccessLoggedRef = useRef(false);
  const hasReadinessSnapshotRef = useRef(false);
  const [range, setRange] = useState(defaultRange);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [resettingLogs, setResettingLogs] = useState(false);
  const queryClient = useQueryClient();
  const [pilotInfoExpanded, setPilotInfoExpanded] = useState(false);
  const [pilotStatus, setPilotStatus] = useState<PilotControlStatus | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [productionReady, setProductionReady] = useState<boolean | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [readinessStale, setReadinessStale] = useState(false);
  const [lastReadinessSnapshotAt, setLastReadinessSnapshotAt] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      dateFromYmd: range.dateFromYmd,
      dateToYmd: range.dateToYmd,
      filterUserId,
    }),
    [range.dateFromYmd, range.dateToYmd, filterUserId],
  );

  const profilesQ = useSecurityProfilesQuery(!!isAdmin);
  const dash = useSecurityDashboardData(filters);
  const usersQ = useSecurityUsersPermissionsQuery(!!isAdmin);
  const recentActivityQ = useRecentSystemActivity(!!isAdmin);

  const selectedUser = useMemo(
    () => usersQ.users.find((u) => u.id === selectedUserId) ?? null,
    [usersQ.users, selectedUserId],
  );

  const runControlCenterCheck = useCallback(async (includeBuildChecks = false) => {
    setReadinessLoading(true);
    setReadinessError(null);
    const res = await runSecurityReleaseControlAction(includeBuildChecks);
    setReadinessLoading(false);
    if (!res.ok) {
      setReadinessError(res.message);
      setReadinessStale(hasReadinessSnapshotRef.current);
      return;
    }
    setPilotStatus(res.payload.pilot);
    setChecklist(res.payload.checklist);
    setProductionReady(res.payload.readiness.ready);
    setReadinessStale(false);
    setLastReadinessSnapshotAt(new Date().toISOString());
    hasReadinessSnapshotRef.current = true;
  }, []);

  const togglePilotDb = useCallback(
    async (enabled: boolean) => {
      const res = await setPilotDbOverrideAction(enabled);
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      setPilotStatus(res.status);
      gestToast.successDone();
      void runControlCenterCheck(false);
    },
    [gestToast, runControlCenterCheck],
  );

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

  useEffect(() => {
    if (!isAdmin) return;
    void runControlCenterCheck(false);
  }, [isAdmin, runControlCenterCheck]);

  useEffect(() => {
    if (!isAdmin) return;
    const sb = getBrowserSupabase();
    const channel = sb
      .channel("security-release-control-center")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          void runControlCenterCheck(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_permissions" },
        () => {
          void (async () => {
            const { invalidateRuntimeTruth } = await import(
              "@/src/lib/runtime/truth-layer/invalidate-runtime-truth"
            );
            await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient });
            await usersQ.refetch();
            await runControlCenterCheck(false);
          })();
        },
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [isAdmin, queryClient, runControlCenterCheck, usersQ]);

  const { logsQuery, recentLogins, recentLoginFailed, activeTodayCount, activeTodayIds, lastAccessPerUser } = dash;

  async function handleResetChangeLogs() {
    const ok = await confirm({
      title: "Resettare log modifiche?",
      message:
        "L'azione è irreversibile e non elimina utenti o dati operativi.",
      destructive: true,
      confirmLabel: "Resetta log",
    });
    if (!ok) return;
    setResettingLogs(true);
    try {
      const res = await resetGlobalChangeLogsByAdminAction();
      if (!res.ok) {
        gestToast.error(res.message);
        return;
      }
      const { invalidateOperationalTruth } = await import(
        "@/src/lib/runtime/truth-layer/invalidate-runtime-truth"
      );
      await invalidateOperationalTruth({ queryClient, domain: "report" });
      await Promise.all([recentActivityQ.refetch(), logsQuery.refetch()]);
      gestToast.successOnce(
        "security-reset-logs",
        `Log modifiche resettato. Righe rimosse: ${res.deletedCount ?? "n/d"}.`,
      );
    } catch (e) {
      gestToast.errorOnce("security-reset-logs", e);
    } finally {
      setResettingLogs(false);
    }
  }

  const activeTodayRows = useMemo(() => {
    const pmap = new Map((profilesQ.data ?? []).map((p) => [p.id, p.nome]));
    return activeTodayIds
      .map((id) => ({ id, nome: pmap.get(id)?.trim() || "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [activeTodayIds, profilesQ.data]);

  if (!isAdmin) {
    return (
      <div className={dsStackPage}>
        <PageHeader title="Sicurezza" />
        <ShellCard title="Accesso negato">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Questa area è riservata agli amministratori. Operatore e altri ruoli non possono accedere alla gestione sicurezza.
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
        actions={
          <div className={gestionalePageToolbarActionsClass}>
            <button
              type="button"
              className={dsPageToolbarBtn}
              onClick={() =>
                void Promise.all([logsQuery.refetch(), recentActivityQ.refetch(), profilesQ.refetch()])
              }
              disabled={logsQuery.isFetching || recentActivityQ.isFetching}
            >
              {logsQuery.isFetching || recentActivityQ.isFetching ? "Aggiornamento…" : "Aggiorna dati"}
            </button>
            <button type="button" className={dsPageToolbarBtn} onClick={() => void runControlCenterCheck(true)} disabled={readinessLoading}>
              {readinessLoading ? "Controllo…" : "Esegui checklist completa"}
            </button>
            <button type="button" className={dsBtnDanger} onClick={() => void handleResetChangeLogs()} disabled={resettingLogs}>
              {resettingLogs ? "Reset…" : "Resetta log modifiche"}
            </button>
          </div>
        }
      />

      <ShellCard title="Security & Release Control Center" subtitle="Single source of truth per permessi, pilot mode e readiness di produzione.">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">1) RBAC & Permissions</h3>
              <span className="rounded-md border border-[color:var(--cab-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                Gestione utenti + coerenza RLS
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Utenti gestiti</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[color:var(--cab-text)]">{usersQ.users.length}</p>
              </div>
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Stato RLS</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">
                  {pilotStatus ? "Verificato" : "Da verificare"}
                </p>
              </div>
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Mismatch UI/DB</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">
                  {checklist.filter((c) => c.status === "fail" && (c.category === "rbac" || c.category === "security")).length}
                </p>
              </div>
            </div>
            <SecurityUsersPermissionsPanel readOnly={!isAdmin} onOpenDetail={setSelectedUserId} />
            <UserDetailDrawer user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUserId(null)} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">PILOT MODE — Override funzionalità operatori</h3>
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Consente agli operatori di modificare impostazioni globali nel pilot.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">isOperatorGlobalSettingsEnabled()</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.effectiveEnabled ? "TRUE" : "FALSE"}</p>
              </div>
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">ENV flag</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.envEnabled ? "ON" : "OFF"}</p>
              </div>
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">DB flag app_settings</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.dbEnabled ? "ON" : "OFF"}</p>
              </div>
              <div className={dsSurfaceInteractiveKpi}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Override attivo</p>
                <p className="mt-1 text-base font-bold text-[color:var(--cab-text)]">{pilotStatus?.effectiveEnabled ? "ON" : "OFF"}</p>
              </div>
            </div>
            <div className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2 text-xs text-[color:var(--cab-text)]">
              Stato pilot:
              {" "}
              <strong>
                {pilotStatus?.state === "complete"
                  ? "COMPLETO (UI + RLS attivo)"
                  : pilotStatus?.state === "ui_only"
                    ? "SOLO UI ATTIVO"
                    : pilotStatus?.state === "db_only"
                      ? "SOLO DB ATTIVO"
                      : "DISATTIVO (produzione-safe)"}
              </strong>
            </div>
            {pilotStatus?.incoherent ? (
              <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:var(--cab-text)]">
                INCOERENTE (risk mode): UI ON e DB OFF (o viceversa).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={dsPageToolbarBtn} disabled title="L'env non è modificabile dalla UI.">
                Toggle UI (env): {pilotStatus?.envEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                className={dsPageToolbarBtn}
                onClick={() => void togglePilotDb(!(pilotStatus?.dbEnabled ?? false))}
                disabled={readinessLoading}
              >
                Toggle DB (app_settings): {pilotStatus?.dbEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                className={dsBtnDanger}
                onClick={() => void togglePilotDb(false)}
                disabled={readinessLoading}
              >
                Disattiva completamente pilot override
              </button>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-[color:var(--cab-text-muted)]">
              <input
                type="checkbox"
                checked={pilotInfoExpanded}
                onChange={(e) => setPilotInfoExpanded(e.target.checked)}
              />
              Mostra avviso pilot mode
            </label>
            {pilotInfoExpanded ? (
              <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:var(--cab-text)]">
                Solo ambiente pilot/dev. Non attivare in produzione.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">PRODUCTION READINESS CHECKLIST</h3>
              {productionReady != null ? (
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                    productionReady
                      ? "bg-[color:color-mix(in_srgb,var(--cab-success)_15%,var(--cab-surface))] text-[color:var(--cab-success)]"
                      : "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:var(--cab-danger)]"
                  }`}
                >
                  {productionReady ? "READY" : "NOT READY"}
                </span>
              ) : null}
            </div>
            {readinessError ? (
              <p className="text-sm text-[color:var(--cab-danger)]">
                {readinessError}
                {readinessStale ? " (snapshot precedente mantenuto: stato STALE)." : ""}
              </p>
            ) : null}
            {readinessStale ? (
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Stato checklist STALE
                {lastReadinessSnapshotAt ? ` · ultimo snapshot valido: ${fmtWhen(lastReadinessSnapshotAt)}` : ""}.
              </p>
            ) : null}
            {readinessLoading && checklist.length === 0 ? (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Esecuzione readiness check…</p>
            ) : null}
            {checklist.length > 0 ? (
              <div className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li key={item.id} className="rounded-md border border-[color:var(--cab-border)] p-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-[color:var(--cab-text)]">{item.label}</p>
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                            item.status === "ok"
                              ? "bg-[color:color-mix(in_srgb,var(--cab-success)_15%,var(--cab-surface))] text-[color:var(--cab-success)]"
                              : "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:var(--cab-danger)]"
                          }`}
                        >
                          {item.status === "ok" ? "OK" : "FAIL"}
                        </span>
                      </div>
                      <p className="mt-1 text-[color:var(--cab-text-muted)]">
                        Categoria: {item.category}
                        {item.explanation ? ` · ${item.explanation}` : ""}
                      </p>
                      {item.source ? <p className="mt-0.5 font-mono text-[10px] text-[color:var(--cab-text-muted)]">Source: {item.source}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      </ShellCard>

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
              <GlobalTableHead>
                  <GlobalTableHeadLabel label="Data/ora" />
                  <GlobalTableHeadLabel label="Entità" />
                  <GlobalTableHeadLabel label="Azione" />
                  <GlobalTableHeadLabel label="Responsabile" />
                  <GlobalTableHeadLabel label="Dettaglio" />
              </GlobalTableHead>
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
          <label className="block min-w-0 flex-1 lg:max-w-xs">
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
      {confirmDialog}
    </div>
  );
}
