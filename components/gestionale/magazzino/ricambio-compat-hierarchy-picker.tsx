"use client";

import { useMemo, useState } from "react";
import { parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  compatLabelsPerMarcheHierarchy,
  flattenCompatFromHierarchyTree,
  marcheFromHierarchyTree,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import { dsFocus, dsInput } from "@/lib/ui/design-system";

const touchActionBtn = `${dsFocus} inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-[color:var(--cab-primary)] hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)] sm:min-h-0 sm:py-1.5`;

function normSearch(s: string): string {
  return s.trim().toLowerCase();
}

export function RicambioCompatHierarchyPicker({
  tree,
  prefsTree,
  marcheHeading,
  modelliHeading,
  emptyMarcheHint,
  emptyModelliHint,
  selectedLines,
  onToggleLine,
  onSetLines,
  disabled = false,
  showDivider = true,
}: {
  tree: HierarchyTreeKey;
  prefsTree: MezziListePrefs;
  marcheHeading: string;
  modelliHeading: string;
  emptyMarcheHint: string;
  emptyModelliHint: string;
  selectedLines: Set<string>;
  onToggleLine: (line: string) => void;
  onSetLines: (lines: readonly string[], selected: boolean) => void;
  disabled?: boolean;
  showDivider?: boolean;
}) {
  const [marcheFiltro, setMarcheFiltro] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");

  const marche = useMemo(() => marcheFromHierarchyTree(prefsTree, tree), [prefsTree, tree]);
  const marcheFiltroList = useMemo(
    () => Array.from(marcheFiltro).sort((a, b) => a.localeCompare(b, "it")),
    [marcheFiltro],
  );

  const allTreeLines = useMemo(
    () => flattenCompatFromHierarchyTree(prefsTree, tree),
    [prefsTree, tree],
  );

  const selectedInTree = useMemo(
    () =>
      Array.from(selectedLines)
        .filter((line) => allTreeLines.includes(line))
        .sort((a, b) => a.localeCompare(b, "it")),
    [selectedLines, allTreeLines],
  );

  const optsSorted = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, tree, marcheFiltroList),
    [prefsTree, tree, marcheFiltroList],
  );

  const q = normSearch(search);

  const optsFiltered = useMemo(() => {
    if (!q) return optsSorted;
    return optsSorted.filter((line) => {
      const { marca, modello } = parseCompatMarcaModello(line);
      return (
        line.toLowerCase().includes(q) ||
        marca.toLowerCase().includes(q) ||
        modello.toLowerCase().includes(q)
      );
    });
  }, [optsSorted, q]);

  const optsGrouped = useMemo(() => {
    const byMarca = new Map<string, string[]>();
    for (const line of optsFiltered) {
      const { marca } = parseCompatMarcaModello(line);
      const key = marca.trim() || "Altro";
      const bucket = byMarca.get(key) ?? [];
      bucket.push(line);
      byMarca.set(key, bucket);
    }
    return Array.from(byMarca.entries()).sort(([a], [b]) => a.localeCompare(b, "it"));
  }, [optsFiltered]);

  const wrapClass = disabled ? "pointer-events-none opacity-60" : "";

  function toggleMarcaFiltro(marca: string) {
    setMarcheFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(marca)) next.delete(marca);
      else next.add(marca);
      return next;
    });
  }

  function marcaSelectionState(lines: readonly string[]): "none" | "partial" | "all" {
    if (lines.length === 0) return "none";
    let n = 0;
    for (const line of lines) {
      if (selectedLines.has(line)) n += 1;
    }
    if (n === 0) return "none";
    if (n === lines.length) return "all";
    return "partial";
  }

  function renderCheckbox(line: string) {
    const { modello } = parseCompatMarcaModello(line);
    return (
      <label
        key={line}
        className={`${dsFocus} flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm active:bg-[var(--cab-hover)] hover:bg-[var(--cab-hover)] sm:min-h-9 sm:gap-2 sm:py-1.5 sm:text-xs`}
      >
        <input
          type="checkbox"
          className="size-5 shrink-0 rounded border-[color:var(--cab-border)] text-[color:var(--cab-primary)] focus:ring-[color:var(--cab-primary)] sm:size-4"
          checked={selectedLines.has(line)}
          onChange={() => onToggleLine(line)}
        />
        <span className="min-w-0 leading-snug text-[color:var(--cab-text)]">{modello || line}</span>
      </label>
    );
  }

  return (
    <div
      className={`${showDivider ? "mt-4 border-t border-[color:var(--cab-border)] pt-4" : ""} ${wrapClass}`.trim()}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {marcheHeading}
      </p>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca marca o modello…"
        className={`${dsInput} mb-2 text-xs`}
        aria-label={`Cerca ${modelliHeading.toLowerCase()}`}
      />

      {marche.length > 0 ? (
        <div className="mb-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Filtra per marca</span>
            {marcheFiltroList.length > 0 ? (
              <button
                type="button"
                className={`${dsFocus} -my-1 min-h-11 rounded-lg px-2 text-xs font-medium text-[color:var(--cab-primary)] hover:underline sm:min-h-0 sm:py-1`}
                onClick={() => setMarcheFiltro(new Set())}
              >
                Rimuovi filtri
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {marche.map((marca) => {
              const active = marcheFiltro.has(marca);
              return (
                <button
                  key={marca}
                  type="button"
                  onClick={() => toggleMarcaFiltro(marca)}
                  aria-pressed={active}
                  className={`${dsFocus} inline-flex min-h-11 items-center rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors sm:min-h-10 sm:px-3 sm:text-xs ${
                    active
                      ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,transparent)] text-[color:var(--cab-text)]"
                      : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)]"
                  }`}
                >
                  {marca}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mb-2 text-[11px] text-[color:var(--cab-text-muted)]">{emptyMarcheHint}</p>
      )}

      {selectedInTree.length > 0 ? (
        <div className="mb-3">
          <span className="mb-1.5 block text-xs font-medium text-[color:var(--cab-text-muted)]">
            Selezionati ({selectedInTree.length})
          </span>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2 sm:max-h-20 sm:gap-1.5 sm:p-1.5">
            {selectedInTree.map((line) => (
              <button
                key={line}
                type="button"
                title="Rimuovi"
                onClick={() => onToggleLine(line)}
                className={`${dsFocus} inline-flex max-w-full min-h-10 items-center gap-1.5 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2 text-xs font-medium text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)] sm:min-h-0 sm:px-2 sm:py-1 sm:text-[11px]`}
              >
                <span className="truncate">{line}</span>
                <span className="shrink-0 text-base leading-none text-[color:var(--cab-text-muted)] sm:text-sm" aria-hidden>
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">{modelliHeading}</span>
        {optsFiltered.length > 0 ? (
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              className={touchActionBtn}
              onClick={() => onSetLines(optsFiltered, true)}
            >
              Seleziona tutti
            </button>
            <button
              type="button"
              className={touchActionBtn}
              onClick={() => onSetLines(optsFiltered, false)}
            >
              Deseleziona tutti
            </button>
          </span>
        ) : null}
      </div>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1 py-2 sm:max-h-52 sm:px-2">
        {optsFiltered.length === 0 ? (
          <p className="px-1 text-[11px] text-[color:var(--cab-text-muted)]">
            {marche.length === 0
              ? emptyModelliHint
              : q
                ? "Nessun risultato per la ricerca."
                : marcheFiltroList.length > 0
                  ? "Nessun modello per le marche filtrate."
                  : emptyModelliHint}
          </p>
        ) : (
          <div className="space-y-3">
            {optsGrouped.map(([marca, lines]) => {
              const sel = marcaSelectionState(lines);
              return (
                <div key={marca} className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-1 sm:border-0 sm:bg-transparent sm:p-0">
                  <div className="mb-1 flex min-h-11 items-center justify-between gap-2 rounded-md px-2 sm:mb-1 sm:min-h-0 sm:px-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)] sm:text-[10px]">
                      {marca}
                    </span>
                    <button
                      type="button"
                      className={touchActionBtn}
                      onClick={() => onSetLines(lines, sel !== "all")}
                    >
                      {sel === "all" ? "Deseleziona marca" : "Seleziona marca"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">{lines.map((line) => renderCheckbox(line))}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
