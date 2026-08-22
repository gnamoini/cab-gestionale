"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
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

const selectClass =
  "h-10 min-w-[10rem] rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-sm text-[color:var(--cab-text)] shadow-sm";

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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            className={selectClass}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as DecisionPriority | "all")}
            aria-label="Filtro priorità"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DecisionCategory | "all")}
            aria-label="Filtro area"
          >
            {CATEGORY_FILTERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
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
