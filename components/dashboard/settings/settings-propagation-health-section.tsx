"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { SettingsSectionHeader } from "@/components/dashboard/settings-list-ui";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  propagationStatusLabel,
  summarizePropagationHealth,
  type PropagationHealthKindSummary,
} from "@/lib/settings/propagation-health-summary";
import { settingsRenameEngineEntry } from "@/lib/domain/settings-rename-engine-entry";
import { invalidateAfterSettingsRenamePropagation } from "@/src/lib/react-query/invalidate-related";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { runWithCorrelationIdAsync } from "@/lib/observability/runtime-correlation-context";
import { withRenamePropagationTimeout } from "@/lib/settings/rename-engine/propagation-timeout";
import type { SettingsRenameJobRow } from "@/src/services/settings-rename-job.service";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

async function fetchDistinctMezziAssociationValues(): Promise<{
  utilizzatori: string[];
  clienti: string[];
  cantieri: string[];
}> {
  const sb = await getBrowserSupabase();
  const { data, error } = await sb.from("mezzi").select("cliente, utilizzatore, meta");
  if (error) throw new Error(error.message);
  const utilizzatori = new Set<string>();
  const clienti = new Set<string>();
  const cantieri = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.utilizzatore === "string" && row.utilizzatore.trim()) utilizzatori.add(row.utilizzatore.trim());
    if (typeof row.cliente === "string" && row.cliente.trim()) clienti.add(row.cliente.trim());
    const meta = row.meta;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const c = (meta as Record<string, unknown>).cantiere;
      if (typeof c === "string" && c.trim()) cantieri.add(c.trim());
    }
  }
  return {
    utilizzatori: [...utilizzatori],
    clienti: [...clienti],
    cantieri: [...cantieri],
  };
}

function statusBadgeClass(status: PropagationHealthKindSummary["status"]): string {
  switch (status) {
    case "ok":
      return "text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "text-amber-700 dark:text-amber-400";
    case "configuration_only":
    case "drift":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-[color:var(--cab-text-muted)]";
  }
}

export function SettingsPropagationHealthSection({ liste }: { liste: MezziListePrefs }) {
  const { user } = useAuth();
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<SettingsRenameJobRow[]>([]);
  const [recentJobs, setRecentJobs] = useState<SettingsRenameJobRow[]>([]);
  const [operational, setOperational] = useState<{ utilizzatori: string[]; clienti: string[]; cantieri: string[] }>({
    utilizzatori: [],
    clienti: [],
    cantieri: [],
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ops, pendingRes, recentRes] = await Promise.all([
        fetchDistinctMezziAssociationValues(),
        settingsRenameEngineEntry.listPendingOrDriftJobs(),
        settingsRenameEngineEntry.listRecentJobs(30),
      ]);
      setOperational(ops);
      if (pendingRes.success && pendingRes.data) setPendingJobs(pendingRes.data);
      if (recentRes.success && recentRes.data) setRecentJobs(recentRes.data);
    } catch (e) {
      gestToast.errorOnce("propagation-health-load", e instanceof Error ? e.message : "Caricamento stato propagazioni fallito");
    } finally {
      setLoading(false);
    }
  }, [gestToast]);

   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    void reload();
  }, [reload, liste]);

  const summaries = useMemo(
    () =>
      summarizePropagationHealth({
        catalogByKind: {
          utilizzatore: liste.utilizzatori,
          cliente: liste.clienti,
          cantiere: liste.cantieri,
        },
        operationalByKind: {
          utilizzatore: operational.utilizzatori,
          cliente: operational.clienti,
          cantiere: operational.cantieri,
        },
        pendingJobs,
      }),
    [liste, operational, pendingJobs],
  );

  const repairJob = useCallback(
    async (job: SettingsRenameJobRow) => {
      if (!user?.id) return;
      setRepairingId(job.id);
      try {
        const plan = buildRenamePlan({
          kind: job.kind as import("@/lib/settings/settings-rename-types").SettingsRenameKind,
          oldLabel: job.old_label,
          newLabel: job.new_label,
          entityId: job.entity_id ?? job.old_label,
        });
        const labels =
          job.kind === "utilizzatore"
            ? liste.utilizzatori
            : job.kind === "cliente"
              ? liste.clienti
              : liste.cantieri;
        const res = await runWithCorrelationIdAsync(plan.correlationId, () =>
          withRenamePropagationTimeout(() =>
            settingsRenameEngineEntry.runRenameJob({
              plan,
              userId: user.id,
              executionMode: "live_propagation",
              existingLabels: labels,
              catalogBeforeRename: [...labels, job.old_label],
              propagate: true,
              source: "repair",
              parentJobId: job.id,
            }),
          ),
        );
        if (!res.success) {
          gestToast.errorOnce("propagation-repair", res.error ?? "Riparazione drift fallita", { action: "update" });
          return;
        }
        invalidateAfterSettingsRenamePropagation(queryClient, [job.kind as import("@/lib/settings/settings-rename-types").SettingsRenameKind]);
        gestToast.successOnce("propagation-repair", "Drift riparato — record operativi aggiornati");
        await reload();
      } finally {
        setRepairingId(null);
      }
    },
    [gestToast, liste, queryClient, reload, user?.id],
  );

  return (
    <div className="w-full space-y-6">
      <SettingsSectionHeader title="Stato propagazioni" description="Allineamento catalogo Impostazioni ↔ dati operativi (Mezzi, schede, preventivi)." />
      {loading ? <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p> : null}
      <div className="overflow-x-auto rounded-lg border border-[color:var(--cab-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--cab-surface-muted)] text-left text-xs uppercase text-[color:var(--cab-text-muted)]">
            <tr>
              <th className="px-3 py-2">Impostazione</th>
              <th className="px-3 py-2">Stato</th>
              <th className="px-3 py-2">Drift record</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const repairable = s.items.find((i) => i.jobId);
              return (
                <tr key={s.kind} className="border-t border-[color:var(--cab-border)]">
                  <td className="px-3 py-2 font-medium">{s.label}</td>
                  <td className={`px-3 py-2 capitalize ${statusBadgeClass(s.status)}`}>{s.status.replace("_", " ")}</td>
                  <td className="px-3 py-2">{s.driftCount}</td>
                  <td className="px-3 py-2">
                    {repairable?.jobId ? (
                      <button
                        type="button"
                        className={dsBtnPrimary}
                        disabled={repairingId === repairable.jobId}
                        onClick={() => {
                          const job = pendingJobs.find((j) => j.id === repairable.jobId) ?? recentJobs.find((j) => j.id === repairable.jobId);
                          if (job) void repairJob(job);
                        }}
                      >
                        {repairingId === repairable.jobId ? "Riparazione…" : "Ripara drift"}
                      </button>
                    ) : (
                      <span className="text-xs text-[color:var(--cab-text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Storico recente</h3>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs gestionale-scrollbar">
          {recentJobs.length === 0 ? (
            <li className="text-[color:var(--cab-text-muted)]">Nessun job registrato</li>
          ) : (
            recentJobs.map((j) => (
              <li key={j.id} className="flex gap-x-2 text-[color:var(--cab-text-muted)] min-w-0 flex-nowrap sm:flex-wrap">
                <span className="font-medium text-[color:var(--cab-text)]">{j.old_label}</span>
                <span>→</span>
                <span className="font-medium text-[color:var(--cab-text)]">{j.new_label}</span>
                <span>({j.kind})</span>
                <span>{propagationStatusLabel(j.propagation_status ?? "pending_propagation")}</span>
                {j.metrics_json?.records_updated != null ? <span>{j.metrics_json.records_updated} agg.</span> : null}
              </li>
            ))
          )}
        </ul>
        <button type="button" className={`${dsBtnNeutral} mt-3`} onClick={() => void reload()} disabled={loading}>
          Aggiorna
        </button>
      </div>
    </div>
  );
}
