"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { ReportDecisionCard } from "@/components/report/decision-center/report-decision-card";
import {
  patchDecisionStatus,
  useDecisionCenterQuery,
} from "@/components/report/decision-center/use-decision-center-query";
import type { DecisionCategory, DecisionPriority } from "@/lib/report/decision-center/types";
import { useQueryClient } from "@tanstack/react-query";

const PRIORITY_FILTERS: Array<{ value: DecisionPriority | "all"; label: string }> = [
  { value: "all", label: "Tutte le priorità" },
  { value: "critical", label: "Critica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
];

const CATEGORY_FILTERS: Array<{ value: DecisionCategory | "all"; label: string }> = [
  { value: "all", label: "Tutte le aree" },
  { value: "economic", label: "Economia" },
  { value: "operational", label: "Operativo" },
  { value: "commercial", label: "Commerciale" },
  { value: "inventory", label: "Magazzino" },
  { value: "customer", label: "Clienti" },
  { value: "resource", label: "Risorse" },
];

const filterSelectClass = `${globalInputFieldFilter} h-10 min-w-[10rem] text-sm`;

export function ReportDecisionCenter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<DecisionPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<DecisionCategory | "all">("all");
  const qc = useQueryClient();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { data, isLoading, isError, error } = useDecisionCenterQuery(visible);

  const filtered = useMemo(() => {
    let list = data?.decisions ?? [];
    if (priorityFilter !== "all") list = list.filter((d) => d.priority === priorityFilter);
    if (categoryFilter !== "all") list = list.filter((d) => d.category === categoryFilter);
    return list;
  }, [data?.decisions, priorityFilter, categoryFilter]);

  const onStatusChange = async (
    decision: (typeof filtered)[number],
    status: import("@/lib/report/decision-center/types").DecisionStatus,
  ) => {
    await patchDecisionStatus(decision.id, status, decision.conditionHash);
    await qc.invalidateQueries({ queryKey: ["decision-center"] });
  };

  return (
    <div id="bi-decisions" ref={ref} data-testid="report-decision-center">
      <ReportAnalysisSectionShell
        title="Decision Center"
        subtitle="Situazioni che meritano una decisione — supporto, non automazione"
        persistKey="bi-decisions"
        defaultCollapsed
      >
        <div className="mb-4 flex items-center gap-2 flex-nowrap sm:flex-wrap">
          <GlobalSelect
            id="report-decision-priority-filter"
            variant="filter"
            selectOnly
            strictFromList
            aria-label="Filtro priorità"
            inputClassName={filterSelectClass}
            items={PRIORITY_FILTERS.map((p) => ({ value: p.value, label: p.label }))}
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v as DecisionPriority | "all")}
          />
          <GlobalSelect
            id="report-decision-category-filter"
            variant="filter"
            selectOnly
            strictFromList
            aria-label="Filtro area"
            inputClassName={filterSelectClass}
            items={CATEGORY_FILTERS.map((c) => ({ value: c.value, label: c.label }))}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as DecisionCategory | "all")}
          />
          {!isLoading && visible ? (
            <span className="text-xs text-[color:var(--cab-text-muted)]">
              {filtered.length === 1 ? "1 decisione" : `${filtered.length} decisioni`}
            </span>
          ) : null}
        </div>

        {!visible ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento al scroll…</p>
        ) : isLoading ? (
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-[color:var(--cab-danger)]">{error?.message ?? "Errore caricamento"}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna decisione nel periodo selezionato</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((d) => (
              <ReportDecisionCard
                key={d.candidateFingerprint}
                decision={d}
                canWrite
                onStatusChange={(s) => void onStatusChange(d, s)}
              />
            ))}
          </div>
        )}

        {data?.aiStatus === "unavailable" ? (
          <p className="mt-3 text-xs text-[color:var(--cab-text-muted)]" data-testid="decision-ai-unavailable">
            Interpretazione AI non disponibile — candidati deterministici mostrati.
          </p>
        ) : null}
      </ReportAnalysisSectionShell>
    </div>
  );
}
