"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import type { HierarchyTreeKey } from "@/lib/mezzi/hierarchy-list-prefs";
import {
  aggiungiMarcaHierarchy,
  aggiungiModelloHierarchy,
  eliminaMarcaHierarchy,
  eliminaModelloHierarchy,
  getHierarchyTree,
  rinominaMarcaHierarchy,
  rinominaModelloHierarchy,
} from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { erpBtnNeutral, erpBtnSoftOrange, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

const PANEL = "w-full rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900";
const INPUT =
  "min-h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-700 dark:bg-zinc-950";

export function HierarchyTreeSettingsSection({
  treeKey,
  variant,
  liste,
  setListe,
}: {
  treeKey: HierarchyTreeKey;
  /** "marca" = gestione marche; "modello" = gerarchia modelli sotto marca. */
  variant: "marca" | "modello";
  liste: MezziListePrefs;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
}) {
  const tree = useMemo(() => getHierarchyTree(liste, treeKey), [liste, treeKey]);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovoModelloByMarca, setNuovoModelloByMarca] = useState<Record<string, string>>({});
  const [expandedMarcaIds, setExpandedMarcaIds] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "marca"; marcaId: string; label: string; modelCount: number }
    | { kind: "modello"; marcaId: string; modelloId: string; label: string }
    | null
  >(null);

  const sortedTree = useMemo(
    () => [...tree].sort((a, b) => a.nome.localeCompare(b.nome, "it", { sensitivity: "base" })),
    [tree],
  );

  const filteredTree = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sortedTree;
    return sortedTree.filter((m) => {
      if (m.nome.toLowerCase().includes(t)) return true;
      return m.modelli.some((mod) => mod.nome.toLowerCase().includes(t));
    });
  }, [q, sortedTree]);

  function toggleMarcaExpand(id: string) {
    setExpandedMarcaIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function setModelDraft(marcaId: string, value: string) {
    setNuovoModelloByMarca((prev) => ({ ...prev, [marcaId]: value }));
  }

  return (
    <div className="w-full space-y-3">
      <GestionaleSearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca marca o modello…" autoComplete="off" />

      {variant === "marca" ? (
        <div className={PANEL}>
          <div className="flex flex-col gap-2 border-b border-zinc-100 p-3 dark:border-zinc-800 sm:flex-row">
            <input
              className={INPUT}
              value={nuovaMarca}
              onChange={(e) => setNuovaMarca(e.target.value)}
              placeholder="Nuova marca"
              autoComplete="off"
            />
            <button
              type="button"
              className={`${erpBtnSoftOrange} min-h-10 shrink-0 px-3 text-xs`}
              onClick={() => {
                const t = nuovaMarca.trim();
                if (!t) return;
                setListe((prev) => aggiungiMarcaHierarchy(prev, treeKey, t));
                setNuovaMarca("");
              }}
            >
              Aggiungi
            </button>
          </div>
        </div>
      ) : null}

      {filteredTree.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {variant === "marca" ? "Nessuna marca. Aggiungi la prima marca sopra." : "Nessun modello configurato. Aggiungi prima le marche nella sezione Marca."}
        </p>
      ) : (
        <ul className={`${PANEL} divide-y divide-zinc-100 dark:divide-zinc-800`}>
          {filteredTree.map((m) => {
            const modelliOpen = variant === "modello" ? expandedMarcaIds.has(m.id) : false;
            const sortedModelli = [...m.modelli].sort((a, b) =>
              a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
            );
            return (
              <li key={m.id} className="px-2 py-1.5 sm:px-3">
                <div className="flex items-center gap-2">
                  {variant === "modello" ? (
                    <button
                      type="button"
                      onClick={() => toggleMarcaExpand(m.id)}
                      className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-600 shadow-sm hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 ${erpFocus}`}
                      aria-expanded={modelliOpen}
                      title={modelliOpen ? "Comprimi modelli" : "Espandi modelli"}
                    >
                      <span aria-hidden>{modelliOpen ? "▼" : "▶"}</span>
                    </button>
                  ) : null}
                  <input
                    className={`${INPUT} font-semibold text-zinc-900 dark:text-zinc-50`}
                    defaultValue={m.nome}
                    key={`${m.id}-${m.nome}`}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      if (!t || t === m.nome) return;
                      setListe((prev) => rinominaMarcaHierarchy(prev, treeKey, m.id, t));
                    }}
                    aria-label={`Nome marca ${m.nome}`}
                    readOnly={variant === "modello"}
                  />
                  {variant === "marca" ? (
                    <button
                      type="button"
                      className={`${erpBtnNeutral} min-h-9 shrink-0 px-2 py-1.5 text-xs text-red-600 dark:text-red-400`}
                      onClick={() => {
                        setPendingDelete({
                          kind: "marca",
                          marcaId: m.id,
                          label: m.nome,
                          modelCount: m.modelli.length,
                        });
                      }}
                    >
                      Elimina
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {m.modelli.length} modell{m.modelli.length === 1 ? "o" : "i"}
                    </span>
                  )}
                </div>

                {variant === "modello" && modelliOpen ? (
                  <>
                    <ul className="mt-1.5 space-y-1 pl-11">
                      {sortedModelli.map((mod) => (
                        <li key={mod.id} className="flex items-center gap-2 rounded-lg bg-zinc-50/80 px-2 py-1 dark:bg-zinc-800/50">
                          <input
                            className={`${INPUT} text-zinc-800 dark:text-zinc-100`}
                            defaultValue={mod.nome}
                            key={`${mod.id}-${mod.nome}`}
                            onBlur={(e) => {
                              const t = e.target.value.trim();
                              if (!t || t === mod.nome) return;
                              setListe((prev) => rinominaModelloHierarchy(prev, treeKey, m.id, mod.id, t));
                            }}
                            aria-label={`Modello sotto ${m.nome}`}
                          />
                          <button
                            type="button"
                            className={`shrink-0 text-xs text-red-600 hover:underline dark:text-red-400 ${erpFocus}`}
                            onClick={() => {
                              setPendingDelete({
                                kind: "modello",
                                marcaId: m.id,
                                modelloId: mod.id,
                                label: mod.nome,
                              });
                            }}
                          >
                            Elimina
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 flex flex-col gap-2 pl-11 sm:flex-row">
                      <input
                        className={INPUT}
                        value={nuovoModelloByMarca[m.id] ?? ""}
                        onChange={(e) => setModelDraft(m.id, e.target.value)}
                        placeholder="Nuovo modello"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className={`${erpBtnSoftOrange} min-h-10 shrink-0 px-2.5 text-xs`}
                        onClick={() => {
                          const t = (nuovoModelloByMarca[m.id] ?? "").trim();
                          if (!t) return;
                          setListe((prev) => aggiungiModelloHierarchy(prev, treeKey, m.id, t));
                          setModelDraft(m.id, "");
                        }}
                      >
                        Aggiungi
                      </button>
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete?.label}
        detail={
          pendingDelete?.kind === "marca" && pendingDelete.modelCount > 0
            ? `Verranno eliminati anche ${pendingDelete.modelCount} modello${pendingDelete.modelCount === 1 ? "" : "i"} associati.`
            : undefined
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "marca") {
            setListe((prev) => eliminaMarcaHierarchy(prev, treeKey, pendingDelete.marcaId));
            setExpandedMarcaIds((prev) => {
              const n = new Set(prev);
              n.delete(pendingDelete.marcaId);
              return n;
            });
          } else {
            setListe((prev) =>
              eliminaModelloHierarchy(prev, treeKey, pendingDelete.marcaId, pendingDelete.modelloId),
            );
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
