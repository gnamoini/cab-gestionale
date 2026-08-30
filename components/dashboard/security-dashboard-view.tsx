"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { roleLabel } from "@/src/lib/auth/permissions";
import { logSecurityPageAccessAction } from "@/src/actions/security-read";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  SecurityMonitoringSectionLazy,
  SecurityReleaseSectionLazy,
  SecurityRolesPanelLazy,
  SecurityUsersPermissionsPanelLazy,
} from "@/components/dashboard/security/security-tab-loaders";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import { resetGlobalChangeLogsByAdminAction } from "@/src/actions/admin-users";
import { useSicurezzaUsersPermissionsQuery } from "@/src/hooks/use-sicurezza-users-permissions-query";
import { prefetchSicurezzaTabQueries } from "@/lib/security/prefetch-sicurezza-tab-queries";
import { useRecentSystemActivity } from "@/components/dashboard/security/security-monitoring-section";
import {
  dsBtnNeutral,
  dsStackPage,
} from "@/lib/ui/design-system";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useSecurityDashboardData } from "@/src/hooks/use-security-dashboard-data";
import {
  runSecurityReleaseControlAction,
  setPilotDbOverrideAction,
  type ChecklistItem,
} from "@/src/actions/security-release-control";
import type { PilotControlStatus } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";

type SecurityDashboardTab = "users" | "roles" | "monitoring" | "release";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultRange(): { dateFromYmd: string; dateToYmd: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 30);
  return { dateFromYmd: fmtYmd(from), dateToYmd: fmtYmd(to) };
}

export function SecurityDashboardView({ listSurface: serverListSurface, listTier = "lg" }: GestionaleListPageProps) {
  const listSurface = useListSurface(serverListSurface);
  const { user } = useAuth();
  const permissions = usePermissions();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const gestToast = useGestionaleToast();
  const isAdmin = permissions.canManageSecurity;
  const securityAccessLoggedRef = useRef(false);
  const hasReadinessSnapshotRef = useRef(false);
  const [range, setRange] = useState(defaultRange);
  const [activeTab, setActiveTab] = useState<SecurityDashboardTab>("users");
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
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

  const dash = useSecurityDashboardData(filters, { enabled: activeTab === "monitoring" });
  const needsUsers = activeTab === "users" || activeTab === "monitoring";
  const usersQ = useSicurezzaUsersPermissionsQuery(!!isAdmin && needsUsers);
  const recentActivityQ = useRecentSystemActivity(!!isAdmin && activeTab === "monitoring");

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
    void logSecurityPageAccessAction().catch(() => {
      /* audit best effort */
    });
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "release") return;
    if (hasReadinessSnapshotRef.current) return;
    void runControlCenterCheck(false);
  }, [isAdmin, activeTab, runControlCenterCheck]);

  const selectTab = useCallback(
    (tab: SecurityDashboardTab) => {
      prefetchSicurezzaTabQueries(queryClient, tab, {
        userId: user?.id,
        dateFromYmd: range.dateFromYmd,
        dateToYmd: range.dateToYmd,
        filterUserId,
      });
      setActiveTab(tab);
    },
    [filterUserId, queryClient, range.dateFromYmd, range.dateToYmd, user?.id],
  );

  const usersRefetchRef = useRef(usersQ.refetch);
  const runControlCenterCheckRef = useRef(runControlCenterCheck);
  const isAdminRef = useRef(isAdmin);

  useLayoutEffect(() => {
    usersRefetchRef.current = usersQ.refetch;
    runControlCenterCheckRef.current = runControlCenterCheck;
    isAdminRef.current = isAdmin;
  }, [usersQ.refetch, runControlCenterCheck, isAdmin]);

  useCabSyncListener("settings", () => {
    if (!isAdminRef.current) return;
    void runControlCenterCheckRef.current(false);
  });

  useCabSyncListener("user_permissions", () => {
    if (!isAdminRef.current) return;
    void (async () => {
      const { invalidateRuntimeTruth } = await import(
        "@/src/lib/runtime/truth-layer/invalidate-runtime-truth"
      );
      await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient });
      await usersRefetchRef.current();
      await runControlCenterCheckRef.current(false);
    })();
  });

  const { logsQuery, recentLogins, recentLoginFailed, activeTodayCount, activeTodayIds, lastAccessPerUser } = dash;

  async function handleResetChangeLogs() {
    const ok = await confirm({
      title: "Resettare log modifiche?",
      message: "L'azione è irreversibile e non elimina utenti o dati operativi.",
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
    const umap = new Map(usersQ.users.map((u) => [u.id, u.nome]));
    return activeTodayIds
      .map((id) => ({ id, nome: umap.get(id)?.trim() || "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [activeTodayIds, usersQ.users]);

  const filterUserItems = useMemo(
    () => [
      { value: "", label: "Tutti gli utenti" },
      ...usersQ.users.map((u) => ({
        value: u.id,
        label: `${u.nome} (${roleLabel(u.ruolo)})`,
      })),
    ],
    [usersQ.users],
  );

  if (!isAdmin) {
    return (
      <div className={dsStackPage}>
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
      <HubModalTabBar aria-label="Sezioni sicurezza" className="mb-1">
        <HubModalTab
          id="security-tab-users"
          label="Utenti e permessi"
          active={activeTab === "users"}
          onSelect={() => selectTab("users")}
          panelId="security-panel-users"
        />
        <HubModalTab
          id="security-tab-roles"
          label="Ruoli e matrice"
          active={activeTab === "roles"}
          onSelect={() => selectTab("roles")}
          panelId="security-panel-roles"
        />
        <HubModalTab
          id="security-tab-monitoring"
          label="Monitoraggio accessi"
          active={activeTab === "monitoring"}
          onSelect={() => selectTab("monitoring")}
          panelId="security-panel-monitoring"
        />
        <HubModalTab
          id="security-tab-release"
          label="Release e pilot"
          active={activeTab === "release"}
          onSelect={() => selectTab("release")}
          panelId="security-panel-release"
        />
      </HubModalTabBar>

      {activeTab === "users" ? (
        <div id="security-panel-users" role="tabpanel" aria-labelledby="security-tab-users">
          <SecurityUsersPermissionsPanelLazy readOnly={!isAdmin} sharedUsersQ={usersQ} listSurface={listSurface} listTier={listTier} />
        </div>
      ) : null}

      {activeTab === "roles" ? (
        <div id="security-panel-roles" role="tabpanel" aria-labelledby="security-tab-roles">
          <SecurityRolesPanelLazy readOnly={!isAdmin} />
        </div>
      ) : null}

      {activeTab === "release" ? (
        <SecurityReleaseSectionLazy
          pilotStatus={pilotStatus}
          checklist={checklist}
          productionReady={productionReady}
          readinessLoading={readinessLoading}
          readinessError={readinessError}
          readinessStale={readinessStale}
          lastReadinessSnapshotAt={lastReadinessSnapshotAt}
          pilotInfoExpanded={pilotInfoExpanded}
          onPilotInfoExpandedChange={setPilotInfoExpanded}
          onRunFullChecklist={() => void runControlCenterCheck(true)}
          onTogglePilotDb={(enabled) => void togglePilotDb(enabled)}
        />
      ) : null}

      {activeTab === "monitoring" ? (
        <SecurityMonitoringSectionLazy
          range={range}
          onRangeChange={setRange}
          onResetRange={() => {
            setRange(defaultRange());
            setFilterUserId(null);
          }}
          filterUserId={filterUserId}
          onFilterUserIdChange={setFilterUserId}
          filterUserItems={filterUserItems}
          usersLoading={usersQ.isLoading}
          logsQuery={logsQuery}
          recentActivityQ={recentActivityQ}
          recentLogins={recentLogins}
          recentLoginFailed={recentLoginFailed}
          activeTodayCount={activeTodayCount}
          activeTodayRows={activeTodayRows}
          lastAccessPerUser={lastAccessPerUser}
          failedNote={failedNote}
          resettingLogs={resettingLogs}
          onResetChangeLogs={() => void handleResetChangeLogs()}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
}
