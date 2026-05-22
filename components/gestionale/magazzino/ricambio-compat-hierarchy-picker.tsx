"use client";

import { useMemo, useState } from "react";
import { parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  compatLabelsPerMarcheHierarchy,
  marcheFromHierarchyTree,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";

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

  const marche = useMemo(() => marcheFromHierarchyTree(prefsTree, tree), [prefsTree, tree]);
  const marcheFiltroList = useMemo(
    () => Array.from(marcheFiltro).sort((a, b) => a.localeCompare(b, "it")),
    [marcheFiltro],
  );

  const optsSorted = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, tree, marcheFiltroList),
    [prefsTree, tree, marcheFiltroList],
  );

  const optsGrouped = useMemo(() => {
    const byMarca = new Map<string, string[]>();
    for (const line of optsSorted) {
      const { marca } = parseCompatMarcaModello(line);
      const key = marca.trim() || "Altro";
      const bucket = byMarca.get(key) ?? [];
      bucket.push(line);
      byMarca.set(key, bucket);
    }
    return Array.from(byMarca.entries()).sort(([a], [b]) => a.localeCompare(b, "it"));
  }, [optsSorted]);

  const wrapClass = disabled ? "pointer-events-none opacity-60" : "";

  function toggleMarcaFiltro(marca: string) {
    setMarcheFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(marca)) next.delete(marca);
      else next.add(marca);
      return next;
    });
  }

  function renderCheckbox(line: string) {
    return (
      <label
        key={line}
        className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-white dark:hover:bg-zinc-800/80"
      >
        <input
          type="checkbox"
          className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
          checked={selectedLines.has(line)}
          onChange={() => onToggleLine(line)}
        />
        <span className="leading-snug text-zinc-800 dark:text-zinc-200">{line}</span>
      </label>
    );
  }

  return (
    <div
      className={`${showDivider ? "mt-4 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/80" : ""} ${wrapClass}`.trim()}
    >
      <div className="mb-2">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{marcheHeading}</span>
          {marcheFiltroList.length > 0 ? (
            <button
              type="button"
              className="text-[11px] font-medium text-[color:var(--cab-primary)] hover:underline"
              onClick={() => setMarcheFiltro(new Set())}
            >
              Mostra tutte
            </button>
          ) : null}
        </div>
        <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
          {marche.length === 0 ? (
            <p className="px-1 text-[11px] text-zinc-500">{emptyMarcheHint}</p>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {marche.map((marca) => (
                <label
                  key={marca}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs hover:bg-white dark:hover:bg-zinc-800/80"
                >
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                    checked={marcheFiltro.has(marca)}
                    onChange={() => toggleMarcaFiltro(marca)}
                  />
                  <span className="text-zinc-800 dark:text-zinc-200">{marca}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{modelliHeading}</span>
        {optsSorted.length > 0 ? (
          <span className="flex gap-2 text-[11px] font-medium">
            <button
              type="button"
              className="text-[color:var(--cab-primary)] hover:underline"
              onClick={() => onSetLines(optsSorted, true)}
            >
              Seleziona tutti
            </button>
            <button
              type="button"
              className="text-[color:var(--cab-primary)] hover:underline"
              onClick={() => onSetLines(optsSorted, false)}
            >
              Rimuovi tutti
            </button>
          </span>
        ) : null}
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
        {optsSorted.length === 0 ? (
          <p className="px-1 text-[11px] text-zinc-500">
            {marcheFiltroList.length > 0 ? "Nessun modello per le marche selezionate." : emptyModelliHint}
          </p>
        ) : optsGrouped.length > 1 ? (
          <div className="space-y-2">
            {optsGrouped.map(([marca, lines]) => (
              <div key={marca}>
                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {marca}
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{lines.map((line) => renderCheckbox(line))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{optsSorted.map((line) => renderCheckbox(line))}</div>
        )}
      </div>
    </div>
  );
}
