"use client";

import type { DocumentAiIndexBadgeState } from "@/lib/documents/document-spare-parts-meta";

function badgeGlyph(state: string): string {
  if (state === "ready") return "✓";
  if (state === "processing") return "…";
  if (state === "partial") return "~";
  if (state === "failed") return "✗";
  if (state === "disabled") return "—";
  return "○";
}

function labelFor(axis: keyof DocumentAiIndexBadgeState, state: string): string {
  const base =
    axis === "fileSearch" ? "File Search" : axis === "aiCatalog" ? "AI Catalog" : "Esplosi";
  if (state === "ready") return `${base} pronto`;
  if (state === "processing") return `${base} in elaborazione`;
  if (state === "partial") return `${base} parziale`;
  if (state === "failed") return `${base} errore`;
  if (state === "disabled") return `${base} disabilitato`;
  return `${base} non disponibile`;
}

export function DocumentAiIndexBadges({ badges }: { badges: DocumentAiIndexBadgeState }) {
  const rows: Array<{ key: keyof DocumentAiIndexBadgeState; state: string }> = [
    { key: "fileSearch", state: badges.fileSearch },
    { key: "aiCatalog", state: badges.aiCatalog },
    { key: "exploded", state: badges.exploded },
  ];

  return (
    <div className="grid gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface)_92%,transparent)] p-3 text-sm">
      <p className="font-medium text-[color:var(--cab-text)]">Indicizzazione Ricambi AI</p>
      <ul className="space-y-1 text-[color:var(--cab-text-muted)]">
        {rows.map((r) => (
          <li key={r.key}>
            <span aria-hidden>{badgeGlyph(r.state)}</span> {labelFor(r.key, r.state)}
          </li>
        ))}
      </ul>
    </div>
  );
}
