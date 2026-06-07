"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import {
  SETTINGS_HIERARCHY_MODEL_BOX,
  SETTINGS_HIERARCHY_MODEL_INPUT,
  SETTINGS_LIST_UL,
  SETTINGS_PANEL_SHELL,
  SETTINGS_SECTION_HINT,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsQuickAddRow,
  SettingsRowActionButtons,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { ShellCard } from "@/components/gestionale/shell-card";
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
import {
  dsLabel,
  dsPageToolbarCtaCompact,
  dsPageToolbarMetaChip,
  dsPageToolbarMetaChipAccent,
} from "@/lib/ui/design-system";
import { PageToolbarCtaLabel } from "@/components/design-system";


function HierarchyModelRow({
  value,
  ariaLabel,
  onRenameBlur,
  onRemove,
}: {
  value: string;
  ariaLabel?: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = inputRef.current?.value ?? value;
    onRenameBlur(value, next);
  };

  const cancel = () => {
    if (inputRef.current) inputRef.current.value = value;
  };

  return (
    <li className={SETTINGS_HIERARCHY_MODEL_BOX}>
      <input
        ref={inputRef}
        className={SETTINGS_HIERARCHY_MODEL_INPUT}
        defaultValue={value}
        key={`${value}-hierarchy`}
        aria-label={ariaLabel ?? `Modifica ${value}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
      />
      <SettingsRowActionButtons
        mode="edit"
        itemLabel={value}
        showRemoveInEdit
        onEdit={() => {}}
        onConfirm={commit}
        onCancelEdit={cancel}
        onRemove={onRemove}
      />
    </li>
  );
}

function ModelCountChip({ count }: { count: number }) {
  if (count === 0) {
    return <span className={dsPageToolbarMetaChip}>Nessun modello</span>;
  }
  return (
    <span className={dsPageToolbarMetaChipAccent}>
      {count} modell{count === 1 ? "o" : "i"}
    </span>
  );
}

function MarcaModelsPanel({
  marcaId,
  modelli,
  modelDraft,
  onModelDraftChange,
  onAddModello,
  onRenameModello,
  onRemoveModello,
  gate,
  treeKey,
  setListe,
}: {
  marcaId: string;
  modelli: { id: string; nome: string }[];
  modelDraft: string;
  onModelDraftChange: (v: string) => void;
  onAddModello: () => void;
  onRenameModello: (from: string, to: string) => void;
  onRemoveModello: (modelloId: string, label: string) => void;
  gate: ReturnType<typeof useSettingsSimilarGate>["gate"];
  treeKey: HierarchyTreeKey;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
}) {
  const modelNames = modelli.map((x) => x.nome);
  const sortedModelli = [...modelli].sort((a, b) =>
    a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
  );
  const draftTrimmed = modelDraft.trim();

  return (
    <ul className="space-y-1.5">
      {sortedModelli.map((mod) => (
        <HierarchyModelRow
          key={mod.id}
          value={mod.nome}
          ariaLabel={`Nome modello ${mod.nome}`}
          onRenameBlur={(from, raw) => {
            const t = raw.trim();
            if (!t || t === from) return;
            gate(modelNames, t, from, () => {
              setListe((prev) => rinominaModelloHierarchy(prev, treeKey, marcaId, mod.id, t));
              onRenameModello(from, t);
            });
          }}
          onRemove={() => onRemoveModello(mod.id, mod.nome)}
        />
      ))}
      <li className={`${SETTINGS_HIERARCHY_MODEL_BOX} gap-2 sm:gap-1.5`}>
        <input
          className={SETTINGS_HIERARCHY_MODEL_INPUT}
          value={modelDraft}
          onChange={(e) => onModelDraftChange(e.target.value)}
          placeholder={sortedModelli.length === 0 ? "Primo modello…" : "Nuovo modello…"}
          autoComplete="off"
          aria-label="Nome nuovo modello"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draftTrimmed) onAddModello();
            }
          }}
        />
        <button
          type="button"
          className={`${dsPageToolbarCtaCompact} min-h-10 shrink-0 px-2.5 text-xs sm:w-auto`}
          disabled={!draftTrimmed}
          onClick={onAddModello}
        >
          <PageToolbarCtaLabel short="+ Modello" full="Aggiungi modello" />
        </button>
      </li>
    </ul>
  );
}

export function HierarchyTreeSettingsSection({
  treeKey,
  variant,
  liste,
  setListe,
  onRenameMarca,
  onRenameModello,
}: {
  treeKey: HierarchyTreeKey;
  variant: "marca" | "modello";
  liste: MezziListePrefs;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
  onRenameMarca?: (from: string, to: string) => void;
  onRenameModello?: (marcaContext: string, from: string, to: string) => void;
}) {
  const tree = useMemo(() => getHierarchyTree(liste, treeKey), [liste, treeKey]);
  const marcaNames = useMemo(() => tree.map((m) => m.nome), [tree]);
  const { gate, similarDialog } = useSettingsSimilarGate();
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

  useEffect(() => {
    if (variant !== "modello" || filteredTree.length === 0) return;
    setExpandedMarcaIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(filteredTree.map((m) => m.id));
    });
  }, [variant, filteredTree]);

  useEffect(() => {
    if (variant !== "modello" || !q.trim()) return;
    setExpandedMarcaIds(new Set(filteredTree.map((m) => m.id)));
  }, [variant, q, filteredTree]);

  function setMarcaExpanded(marcaId: string, expanded: boolean) {
    setExpandedMarcaIds((prev) => {
      const n = new Set(prev);
      if (expanded) n.add(marcaId);
      else n.delete(marcaId);
      return n;
    });
  }

  function setModelDraft(marcaId: string, value: string) {
    setNuovoModelloByMarca((prev) => ({ ...prev, [marcaId]: value }));
  }

  function tryAddMarca() {
    const t = nuovaMarca.trim();
    if (!t) return;
    gate(marcaNames, t, undefined, () => {
      setListe((prev) => aggiungiMarcaHierarchy(prev, treeKey, t));
      setNuovaMarca("");
    });
  }

  function tryAddModello(marcaId: string, modelNames: string[]) {
    const t = (nuovoModelloByMarca[marcaId] ?? "").trim();
    if (!t) return;
    gate(modelNames, t, undefined, () => {
      setListe((prev) => aggiungiModelloHierarchy(prev, treeKey, marcaId, t));
      setModelDraft(marcaId, "");
    });
  }

  return (
    <div className="w-full space-y-4">
      {variant === "modello" ? (
        <p className={SETTINGS_SECTION_HINT}>
          Modifica il nome nel campo, poi Conferma (o Invio). Annulla ripristina il testo. La riga in basso aggiunge un
          modello alla marca.
        </p>
      ) : null}

      <GestionaleSearchField
        wrapperClassName="w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca marca o modello…"
        autoComplete="off"
        aria-label="Cerca marca o modello"
      />

      {variant === "marca" ? (
        <div className={`${SETTINGS_PANEL_SHELL} p-3 sm:p-4`}>
          <label className="block">
            <span className={dsLabel}>Nuova marca</span>
            <div className="mt-2">
              <SettingsQuickAddRow
                placeholder="Es. Iveco, Volvo…"
                value={nuovaMarca}
                onChange={setNuovaMarca}
                onAdd={tryAddMarca}
                addLabelShort="+ Marca"
                addLabel="Aggiungi marca"
                inputAriaLabel="Nome nuova marca"
              />
            </div>
          </label>
        </div>
      ) : null}

      {filteredTree.length === 0 ? (
        <SettingsEmptyState>
          {variant === "marca"
            ? "Nessuna marca. Aggiungi la prima marca sopra."
            : "Nessun risultato. Prova un altro testo o aggiungi marche nella sezione Marca."}
        </SettingsEmptyState>
      ) : variant === "modello" ? (
        <div className="space-y-2">
          {filteredTree.map((m) => {
            const modelliOpen = expandedMarcaIds.has(m.id);
            const modelDraft = nuovoModelloByMarca[m.id] ?? "";
            const modelNames = m.modelli.map((x) => x.nome);

            return (
              <ShellCard
                key={m.id}
                title={m.nome}
                collapsible
                compactContent
                compactHeader
                headerActionsDivider={false}
                collapsed={!modelliOpen}
                onCollapsedChange={(collapsed) => setMarcaExpanded(m.id, !collapsed)}
                headerActions={<ModelCountChip count={m.modelli.length} />}
              >
                <MarcaModelsPanel
                  marcaId={m.id}
                  modelli={m.modelli}
                  modelDraft={modelDraft}
                  onModelDraftChange={(v) => setModelDraft(m.id, v)}
                  onAddModello={() => tryAddModello(m.id, modelNames)}
                  onRenameModello={(from, to) => onRenameModello?.(m.nome, from, to)}
                  onRemoveModello={(modelloId, label) =>
                    setPendingDelete({ kind: "modello", marcaId: m.id, modelloId, label })
                  }
                  gate={gate}
                  treeKey={treeKey}
                  setListe={setListe}
                />
              </ShellCard>
            );
          })}
        </div>
      ) : (
        <div className={SETTINGS_PANEL_SHELL}>
          <ul className={`${SETTINGS_LIST_UL} p-2 sm:p-3`}>
            {filteredTree.map((m) => (
              <SettingsEditableStringRow
                key={m.id}
                value={m.nome}
                onRenameBlur={(from, raw) => {
                  const t = raw.trim();
                  if (!t || t === from) return;
                  gate(marcaNames, t, from, () => {
                    setListe((prev) => rinominaMarcaHierarchy(prev, treeKey, m.id, t));
                    onRenameMarca?.(from, t);
                  });
                }}
                onRemove={() =>
                  setPendingDelete({
                    kind: "marca",
                    marcaId: m.id,
                    label: m.nome,
                    modelCount: m.modelli.length,
                  })
                }
              />
            ))}
          </ul>
        </div>
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
      {similarDialog}
    </div>
  );
}
