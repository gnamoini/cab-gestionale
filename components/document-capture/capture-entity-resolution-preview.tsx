"use client";

import type { EntityResolutionAuditRecord, EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    exact_match: "Corrispondenza esatta",
    canonical_legal_suffix: "Rimozione suffisso legale",
    canonical_geographic: "Rimozione suffisso geografico",
    canonical_first_token: "Match marca principale",
    alias_settings: "Alias impostazioni",
    known_ocr_correction: "Correzione OCR nota",
    dictionary_token: "Normalizzazione dizionario",
    hierarchy_constraint: "Vincolo gerarchia",
    graph_constraint: "Vincolo contesto documento",
    fuzzy_typo: "Correzione typo",
    llm_validation: "Validazione semantica",
    manual_confirmation: "Conferma manuale",
    ambiguous: "Ambiguo",
    unresolved: "Non risolto",
  };
  return map[reason] ?? reason;
}

function strategyLabel(strategy: string): string {
  if (strategy === "exact") return "Exact match";
  if (strategy === "canonical") return "Canonical match";
  if (strategy === "alias") return "Alias";
  if (strategy === "known_correction") return "Known correction";
  if (strategy === "fuzzy") return "Typo correction";
  if (strategy === "llm_semantic") return "LLM validation";
  return strategy;
}

export function CaptureEntityResolutionPreview({
  records,
}: {
  records: readonly (EntityResolutionAuditRecord | EntityResolutionResult)[];
}) {
  const resolved = records.filter(
    (r) => ("status" in r ? r.status === "resolved" : Boolean(r.chosen?.label)) && r.original !== (r.chosen?.label ?? ("resolvedLabel" in r ? r.resolvedLabel : null)),
  );
  if (resolved.length === 0) return null;

  return (
    <section className="space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-accent)_25%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-accent)_6%,var(--cab-surface))] p-3">
      <h3 className="text-sm font-medium text-[color:var(--cab-fg)]">Riconciliazione entità</h3>
      <ul className="space-y-2 text-sm">
        {resolved.map((r) => {
          const original = "original" in r ? r.original : r.originalValue;
          const label = "chosen" in r ? r.chosen.label : r.resolvedLabel;
          const confidence = r.confidence;
          const reason = "reason" in r ? r.reason : "exact_match";
          const strategy = "strategy" in r ? r.strategy : "exact";
          return (
            <li key={`${"fieldKey" in r ? r.fieldKey : r.fieldKey}-${original}`} className="grid gap-0.5 sm:grid-cols-[1fr_auto]">
              <div>
                <span className="text-[color:var(--cab-muted-fg)]">Documento:</span>{" "}
                <span className="font-medium">{original}</span>
                <span className="mx-1 text-[color:var(--cab-muted-fg)]">→</span>
                <span className="font-semibold text-[color:var(--cab-fg)]">{label}</span>
              </div>
              <div className="text-xs text-[color:var(--cab-muted-fg)] sm:text-right">
                {Math.round(confidence * 100)}% · {strategyLabel(strategy)} · {reasonLabel(reason)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
