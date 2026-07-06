"use client";

import { useQuery } from "@tanstack/react-query";
import { GestionaleInfoCard, GestionaleInfoRow } from "@/components/design-system/gestionale-info-card";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import { assetComplianceEntry } from "@/lib/domain/asset-compliance-entry";
import { useAssetLifecycleV1Enabled } from "@/src/hooks/use-asset-lifecycle-v1-enabled";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";

export function KpiPerformanceCompliance() {
  const flags = useAssetLifecycleV1Enabled();
  const complianceOn = isAssetLifecycleSubFlagActive(flags, "compliance");

  const rulesQuery = useQuery({
    queryKey: ["kpi-compliance-upcoming"],
    queryFn: async () => {
      const res = await assetComplianceEntry.listUpcomingRules(60);
      return res.success ? res.data : [];
    },
    enabled: complianceOn,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  if (!complianceOn) {
    return (
      <GestionaleInfoCard title="Scadenze e compliance" subtitle="Modulo lifecycle disabilitato">
        <GestionaleInfoRow
          label="Asset Lifecycle"
          value="Abilitare asset_lifecycle_v1 (compliance) per monitorare revisioni, assicurazioni e tagliandi."
        />
      </GestionaleInfoCard>
    );
  }

  const rules = rulesQuery.data ?? [];
  const overdue = rules.filter((r) => r.next_due_at && r.next_due_at < new Date().toISOString().slice(0, 10));
  const upcoming = rules.filter((r) => r.next_due_at && r.next_due_at >= new Date().toISOString().slice(0, 10));

  return (
    <GestionaleInfoCard title="Scadenze e compliance" subtitle="Regole attive imminenti">
      {rulesQuery.isLoading ? (
        <GestionaleInfoRow label="Caricamento" value="…" />
      ) : rules.length === 0 ? (
        <GestionaleInfoRow label="Nessuna scadenza" value="Nessuna regola compliance in scadenza nei prossimi 60 giorni." />
      ) : (
        <>
          {overdue.length > 0 ? (
            <GestionaleInfoRow
              label="Scadute"
              value={`${overdue.length} regole oltre scadenza (${overdue.map((r) => r.rule_kind).slice(0, 3).join(", ")})`}
            />
          ) : null}
          <GestionaleInfoRow
            label="In scadenza (60 gg)"
            value={`${upcoming.length} regole — ${upcoming
              .slice(0, 4)
              .map((r) => `${r.rule_kind} ${r.next_due_at ?? ""}`)
              .join(" · ")}`}
          />
        </>
      )}
    </GestionaleInfoCard>
  );
}
