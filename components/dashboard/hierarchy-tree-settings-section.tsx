"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import {
  SETTINGS_LIST_DIVIDER_UL,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsListBody,
  SettingsListSection,
  SettingsListToolbar,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { useAuthUserId } from "@/context/auth-context";
import {
  collapsibleSetPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
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
import { filterSettingsHierarchyTree } from "@/lib/settings/settings-list-search";
import {
  dsFocus,
  dsPageToolbarCtaCompact,
} from "@/lib/ui/design-system";
import { GestionaleCollapsibleChevronIcon } from "@/components/design-system/gestionale-collapsible-chevron";
import {
  gestionaleCollapsibleChevronBoxClass,
  gestionaleCollapsibleChevronBoxExpandedClass,
  gestionaleCollapsibleEase,
  gestionaleCollapsibleHeaderTriggerClass,
  gestionaleCollapsiblePanelGridClass,
  gestionaleCollapsiblePanelInnerClass,
} from "@/lib/ui/gestionale-collapsible-toggle";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";

const HIERARCHY_MARCA_DRAFT_ROW_KEY = "__settings-hierarchy-marca-draft__";
const HIERARCHY_MODELLO_DRAFT_PREFIX = "__settings-hierarchy-modello-draft__";

const HIERARCHY_MARCA_CARD =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)] transition-[box-shadow,border-color] duration-300 motion-reduce:transition-none";

const HIERARCHY_MARCA_CARD_EXPANDED =
  "border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] shadow-[var(--cab-shadow-md)]";

const HIERARCHY_MARCA_HEADER_ROW =
  `flex min-h-11 flex-wrap items-center gap-x-2 gap-y-2 border-b bg-[color:color-mix(in_srgb,var(--cab-surface)_45%,var(--cab-card))] px-3 py-2 transition-[border-color] duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none sm:flex-nowrap sm:gap-x-3 [-webkit-tap-highlight-color:transparent]`;

function HierarchyMarcaHeaderRow({
  marcaNome,
  expanded,
  addDisabled,
  onToggle,
  onStartAddModel,
}: {
  marcaNome: string;
  expanded: boolean;
  addDisabled: boolean;
  onToggle: () => void;
  onStartAddModel: () => void;
}) {
  return (
    <div
      className={`${HIERARCHY_MARCA_HEADER_ROW}${
        expanded ? " border-[color:var(--cab-border)]" : " border-transparent"
      }`}
    >
      <button
        type="button"
        className={`${gestionaleCollapsibleHeaderTriggerClass} ${dsFocus}`}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span
          className={`${gestionaleCollapsibleChevronBoxClass}${
            expanded ? ` ${gestionaleCollapsibleChevronBoxExpandedClass}` : ""
          }`}
        >
          <GestionaleCollapsibleChevronIcon expanded={expanded} />
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-[color:var(--cab-text)]">{marcaNome}</span>
      </button>
      <button
        type="button"
        className={`${dsPageToolbarCtaCompact} min-h-11 shrink-0 px-2.5 text-xs sm:w-auto`}
        disabled={addDisabled}
        onClick={onStartAddModel}
      >
        <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
        <PageToolbarCtaLabel short="Aggiungi" full="Aggiungi" />
      </button>
    </div>
  );
}

function HierarchyMarcaModelloBlock({
  marcaId,
  marcaNome,
  modelliOpen,
  sortedModelli,
  modelDraftOpen,
  onToggle,
  onStartAddModel,
  onAddModelloFromDraft,
  onCancelModelDraft,
  onRenameModello,
  onRemoveModello,
}: {
  marcaId: string;
  marcaNome: string;
  modelliOpen: boolean;
  sortedModelli: { id: string; nome: string }[];
  modelDraftOpen: boolean;
  onToggle: () => void;
  onStartAddModel: () => void;
  onAddModelloFromDraft: (raw: string) => void;
  onCancelModelDraft: () => void;
  onRenameModello: (modId: string, from: string, to: string) => void;
  onRemoveModello: (modId: string, label: string) => void;
}) {
  return (
    <div className={`${HIERARCHY_MARCA_CARD}${modelliOpen ? ` ${HIERARCHY_MARCA_CARD_EXPANDED}` : ""}`}>
      <HierarchyMarcaHeaderRow
        marcaNome={marcaNome}
        expanded={modelliOpen}
        addDisabled={modelDraftOpen}
        onToggle={onToggle}
        onStartAddModel={onStartAddModel}
      />
      <div
        role="region"
        aria-hidden={!modelliOpen}
        className={`${gestionaleCollapsiblePanelGridClass} ${modelliOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div
          className={`${gestionaleCollapsiblePanelInnerClass} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_72%,var(--cab-card))] ${
            modelliOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <ul className={SETTINGS_LIST_DIVIDER_UL}>
            {modelDraftOpen ? (
              <SettingsEditableStringRow
                key={`${HIERARCHY_MODELLO_DRAFT_PREFIX}${marcaId}`}
                draft
                value=""
                placeholder={sortedModelli.length === 0 ? "Primo modello…" : "Nuovo modello…"}
                onRenameBlur={(_, next) => onAddModelloFromDraft(next)}
                onDraftCancel={onCancelModelDraft}
                onRemove={onCancelModelDraft}
              />
            ) : null}
            {sortedModelli.map((mod) => (
              <SettingsEditableStringRow
                key={mod.id}
                value={mod.nome}
                onRenameBlur={(from, raw) => {
                  const t = raw.trim();
                  if (!t || t === from) return;
                  onRenameModello(mod.id, from, t);
                }}
                onRemove={() => onRemoveModello(mod.id, mod.nome)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
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
  const userId = useAuthUserId();
  const tree = useMemo(() => getHierarchyTree(liste, treeKey), [liste, treeKey]);
  const marcaNames = useMemo(() => tree.map((m) => m.nome), [tree]);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const [marcaDraftOpen, setMarcaDraftOpen] = useState(false);
  const [modelDraftMarcaId, setModelDraftMarcaId] = useState<string | null>(null);
  const [expandedMarcaIds, setExpandedMarcaIds] = useCollapsiblePreference(
    collapsibleSetPref([], {
      scope: "settings-hierarchy",
      key: `tree-${treeKey}`,
      userId,
    }),
  );
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

  const filteredTree = useMemo(() => filterSettingsHierarchyTree(sortedTree, q), [q, sortedTree]);

  function setMarcaExpanded(marcaId: string, expanded: boolean) {
    if (!expanded) {
      setModelDraftMarcaId((prev) => (prev === marcaId ? null : prev));
    }
    setExpandedMarcaIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(marcaId);
      else next.delete(marcaId);
      return next;
    });
  }

  function tryAddMarcaFromDraft(raw: string) {
    const t = raw.trim();
    if (!t) return;
    gate(marcaNames, t, undefined, () => {
      setListe((prev) => aggiungiMarcaHierarchy(prev, treeKey, t));
      setMarcaDraftOpen(false);
    });
  }

  function tryAddModelloFromDraft(marcaId: string, modelNames: string[], raw: string) {
    const t = raw.trim();
    if (!t) return;
    gate(modelNames, t, undefined, () => {
      setListe((prev) => aggiungiModelloHierarchy(prev, treeKey, marcaId, t));
      setModelDraftMarcaId(null);
    });
  }

  const deleteDialog = (
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
  );

  if (variant === "marca") {
    const showList = marcaDraftOpen || filteredTree.length > 0;

    return (
      <>
        <SettingsListSection layout="flat">
          <SettingsListToolbar
            onStartAdd={() => setMarcaDraftOpen(true)}
            addDisabled={marcaDraftOpen}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Cerca marca o modello…"
            searchAriaLabel="Cerca marca o modello"
            addLabel="Aggiungi"
            addLabelShort="Aggiungi"
          />
          <SettingsListBody
            layout="flat"
            showList={showList}
            empty={
              <SettingsEmptyState inline>
                Nessun elemento. Usa Aggiungi per inserire la prima marca.
              </SettingsEmptyState>
            }
          >
            <ul className={SETTINGS_LIST_DIVIDER_UL}>
              {marcaDraftOpen ? (
                <SettingsEditableStringRow
                  key={HIERARCHY_MARCA_DRAFT_ROW_KEY}
                  draft
                  value=""
                  placeholder="Es. Iveco, Volvo…"
                  onRenameBlur={(_, next) => tryAddMarcaFromDraft(next)}
                  onDraftCancel={() => setMarcaDraftOpen(false)}
                  onRemove={() => setMarcaDraftOpen(false)}
                />
              ) : null}
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
          </SettingsListBody>
        </SettingsListSection>
        {deleteDialog}
        {similarDialog}
      </>
    );
  }

  const showList = filteredTree.length > 0;

  return (
    <>
      <SettingsListSection layout="flat">
        <SettingsListToolbar
          showAddButton={false}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Cerca marca o modello…"
          searchAriaLabel="Cerca marca o modello"
        />
        {showList ? (
          <div className="mt-3 flex min-w-0 flex-col gap-3" id="hierarchy-modello-list">
            {filteredTree.map((m) => {
              const modelliOpen = expandedMarcaIds.has(m.id);
              const modelNames = m.modelli.map((x) => x.nome);
              const sortedModelli = [...m.modelli].sort((a, b) =>
                a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
              );

              return (
                <HierarchyMarcaModelloBlock
                  key={m.id}
                  marcaId={m.id}
                  marcaNome={m.nome}
                  modelliOpen={modelliOpen}
                  sortedModelli={sortedModelli}
                  modelDraftOpen={modelDraftMarcaId === m.id}
                  onToggle={() => setMarcaExpanded(m.id, !modelliOpen)}
                  onStartAddModel={() => {
                    setModelDraftMarcaId(m.id);
                    setMarcaExpanded(m.id, true);
                  }}
                  onAddModelloFromDraft={(raw) => tryAddModelloFromDraft(m.id, modelNames, raw)}
                  onCancelModelDraft={() => setModelDraftMarcaId(null)}
                  onRenameModello={(modId, from, t) => {
                    gate(modelNames, t, from, () => {
                      setListe((prev) => rinominaModelloHierarchy(prev, treeKey, m.id, modId, t));
                      onRenameModello?.(m.nome, from, t);
                    });
                  }}
                  onRemoveModello={(modId, label) =>
                    setPendingDelete({ kind: "modello", marcaId: m.id, modelloId: modId, label })
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-3">
            <SettingsEmptyState inline>
              Nessun risultato. Prova un altro testo o aggiungi marche nella sezione Marca.
            </SettingsEmptyState>
          </div>
        )}
      </SettingsListSection>
      {deleteDialog}
      {similarDialog}
    </>
  );
}
