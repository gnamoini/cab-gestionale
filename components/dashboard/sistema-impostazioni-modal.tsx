"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LavorazioniModalHeader, LavorazioniModalShell, SettingsLavorazioniModal } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  DEFAULT_ADDETTI_LAVORAZIONI,
} from "@/lib/lavorazioni/constants";
import {
  addettiLegacyNomi,
  createAddettoId,
  defaultAddettiRecords,
  findAddettoById,
  syncLavorazioniAddettiFromRecords,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  assignColorForNewAddetto,
  removeAddettoFromColorMap,
  renameAddettoInColorMap,
  syncAddettoColorMap,
} from "@/lib/lavorazioni/addetto-colors-assign";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { normalizeStatiList } from "@/lib/lavorazioni/stati-normalize";
import { statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { RicambioCompatRef } from "@/lib/magazzino/ricambio-compat-resolver";
import {
  getScontoFornitoreMarca,
  registerMarcaInMagazzinoMaster,
  removeMarcaFromMagazzinoMaster,
  renameMarcaInMagazzinoMaster,
  setScontoFornitoreMarca,
} from "@/lib/magazzino/marca-fornitore-sconto";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  clampScontoRicambiPercent,
  getScontoRicambiCliente,
  registerClienteInListe,
  removeScontoRicambiCliente,
  renameClienteInListe,
  setScontoRicambiCliente,
} from "@/lib/mezzi/cliente-commerciale";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { appendDashboardSettingsSavedLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { HierarchyTreeSettingsSection } from "@/components/dashboard/hierarchy-tree-settings-section";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { SettingsDipendentiAssenzeSection } from "@/components/dashboard/settings-dipendenti-assenze-section";
import {
  SettingsEditableStringRow,
  SETTINGS_DISCOUNT_INPUT,
  SETTINGS_LIST_DIVIDER_UL,
  SETTINGS_SECTION_CARD,
  SETTINGS_SECTION_HINT,
  SETTINGS_SECTION_TITLE,
} from "@/components/dashboard/settings-list-ui";
import { defaultTipiAssenza, type TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { SettingsRinominaPropagaDialog } from "@/components/dashboard/settings-rinomina-propaga-dialog";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { CloseButton, LoadingImpostazioniSkeleton } from "@/components/design-system";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import {
  dispatchAddettoDisplayRename,
} from "@/lib/sistema/cab-events";
import { migratePreventiviLocalToDb } from "@/lib/preventivi/migrate-preventivi-local-to-db";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { addUniqueToStringList, renameInStringList } from "@/lib/settings/settings-list-mutations";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import { erpBtnNeutral, erpBtnSoftOrange } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";
import { buildBulkRowsFromResolved, resolveCabAppSettingsFromRows, type CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { OperatorGlobalSettingsPilotBadge } from "@/components/gestionale/operator-global-settings-pilot-badge";
import { useCabAppSettingsPayloadQuery, useSettingsBulkMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { invalidateAfterSettingsRenamePropagation } from "@/src/lib/react-query/invalidate-related";
import {
  addStatoFromLabel,
  DEFAULT_STATI_LAVORAZIONI_DB,
  reorderStatiList,
  STATO_LAVORAZIONE_COMPLETATA_DB,
} from "@/src/shared/selectors";
import { useLavorazioniStatiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-stati-in-uso";
import { mergeAppSettingsUpsertWithVersions } from "@/src/services/settings.service";
import { settingsRenamePropagationService } from "@/src/services/settings-rename-propagation.service";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { usePermissions } from "@/src/hooks/use-permissions";
import { cancelRouteTransition } from "@/src/lib/navigation/route-transition";
import {
  dsBtnPrimary,
  dsFocus,
  dsInput,
  dsPageToolbarMetaChipAccent,
  dsStackPage,
  dsTypoSmall,
  gestionaleSelectFilterClass,
} from "@/lib/ui/design-system";

function mergeMaster(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].sort((x, y) => x.localeCompare(y, "it"));
}

type SistemaSettingsSnapshot = {
  stati: StatoLavorazioneConfig[];
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  prioritaDb: PrioritaLavorazione[];
  mag: MagazzinoMasterPrefs;
  liste: MezziListePrefs;
  eco: SistemaPreventiviDefaults;
  tipiAssenza: TipoAssenzaConfig[];
};

function buildResolvedFromModalSnapshot(s: SistemaSettingsSnapshot): CabAppSettingsResolved {
  const synced = syncLavorazioniAddettiFromRecords(s.addettiRecords);
  return {
    lavorazioni: {
      stati: normalizeStatiList(s.stati),
      addettiRecords: synced.addettiRecords,
      addetti: synced.addetti,
      addettoColors: s.addettoColors,
      prioritaColors: s.prioritaColors,
      prioritaDb: s.prioritaDb,
    },
    mezziListe: migrateMezziListePrefs(s.liste),
    magazzinoMaster: s.mag,
    preventiviDefaults: s.eco,
    dipendenti: { tipiAssenza: s.tipiAssenza },
  };
}

function snapshotFromResolved(r: CabAppSettingsResolved): SistemaSettingsSnapshot {
  const addettiRecords =
    r.lavorazioni.addettiRecords?.length &&
    r.lavorazioni.addettiRecords.some((a) => a.nome.trim().length > 0)
      ? r.lavorazioni.addettiRecords.map((a) => ({
          id: a.id,
          nome: a.nome.trim(),
          cognome: a.cognome?.trim() ? a.cognome.trim() : null,
        }))
      : defaultAddettiRecords();
  const addetti = addettiLegacyNomi(addettiRecords);
  return {
    stati: r.lavorazioni.stati?.length ? normalizeStatiList(r.lavorazioni.stati) : [...DEFAULT_STATI_LAVORAZIONI_DB],
    addettiRecords,
    addettoColors: syncAddettoColorMap(addetti, r.lavorazioni.addettoColors),
    prioritaColors: r.lavorazioni.prioritaColors ?? {},
    prioritaDb: r.lavorazioni.prioritaDb?.length ? [...r.lavorazioni.prioritaDb] : [...DEFAULT_PRIORITA_LAVORAZIONI_DB],
    mag: {
      marche: [...r.magazzinoMaster.marche],
      scontoFornitoreByMarca: { ...(r.magazzinoMaster.scontoFornitoreByMarca ?? {}) },
      categorie: [...r.magazzinoMaster.categorie],
      mezziCompatibili: [...r.magazzinoMaster.mezziCompatibili],
      fornitori: [...(r.magazzinoMaster.fornitori ?? [])],
    },
    liste: migrateMezziListePrefs(r.mezziListe),
    eco: { ...r.preventiviDefaults },
    tipiAssenza: r.dipendenti.tipiAssenza?.length ? [...r.dipendenti.tipiAssenza] : defaultTipiAssenza(),
  };
}

function snapshotKey(s: SistemaSettingsSnapshot): string {
  return JSON.stringify(buildResolvedFromModalSnapshot(s));
}

function initialMasterFromProducts(
  src: Array<{
    id?: string;
    marca: string;
    categoria: string;
    compatibilitaMezzi: string[];
    compatibilitaRefs?: RicambioCompatRef[];
    fornitoreNonOriginale?: string;
  }> = [],
  mezziListePrefs?: MezziListePrefs,
) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  const fornitori = new Set<string>();
  for (const r of src) {
    if (r.marca?.trim()) marche.add(r.marca.trim());
    if (r.categoria?.trim()) categorie.add(r.categoria.trim());
    readCompatLabelsForUi(r, mezziListePrefs, "sistema-impostazioni-modal.initialMasterFromProducts").forEach(
      (m) => {
        if (m.trim()) mezzi.add(m.trim());
      },
    );
    if (r.fornitoreNonOriginale?.trim()) fornitori.add(r.fornitoreNonOriginale.trim());
  }
  return {
    marche: [...marche].sort((a, b) => a.localeCompare(b, "it")),
    categorie: [...categorie].sort((a, b) => a.localeCompare(b, "it")),
    mezzi: [...mezzi].sort((a, b) => a.localeCompare(b, "it")),
    fornitori: [...fornitori].sort((a, b) => a.localeCompare(b, "it")),
  };
}

type SistemaSectionId =
  | "op-addetti"
  | "op-dipendenti-assenze"
  | "op-stati"
  | "op-priorita"
  | "mag-marche"
  | "mag-fornitori"
  | "mag-categorie"
  | "cli-cliente"
  | "cli-cantiere"
  | "cli-utilizzatore"
  | "att-tipo"
  | "att-marca"
  | "att-modello"
  | "tel-tipo"
  | "tel-marca"
  | "tel-modello"
  | "sys-economici";

type NavEntry =
  | { kind: "group"; label: string }
  | { kind: "item"; id: SistemaSectionId; label: string };

const NAV_STRUCTURE: NavEntry[] = [
  { kind: "group", label: "Operatività" },
  { kind: "item", id: "op-addetti", label: "Addetti" },
  { kind: "item", id: "op-dipendenti-assenze", label: "Tipi assenza dipendenti" },
  { kind: "item", id: "op-stati", label: "Stati lavorazioni" },
  { kind: "item", id: "op-priorita", label: "Priorità" },
  { kind: "group", label: "Magazzino" },
  { kind: "item", id: "mag-marche", label: "Marche ricambi" },
  { kind: "item", id: "mag-fornitori", label: "Fornitori alternativi" },
  { kind: "item", id: "mag-categorie", label: "Categorie" },
  { kind: "group", label: "Clienti commerciali" },
  { kind: "item", id: "cli-cliente", label: "Cliente" },
  { kind: "item", id: "cli-cantiere", label: "Cantiere" },
  { kind: "item", id: "cli-utilizzatore", label: "Utilizzatore" },
  { kind: "group", label: "Attrezzatura" },
  { kind: "item", id: "att-tipo", label: "Tipo attrezzatura" },
  { kind: "item", id: "att-marca", label: "Marca" },
  { kind: "item", id: "att-modello", label: "Modello" },
  { kind: "group", label: "Telaio" },
  { kind: "item", id: "tel-tipo", label: "Tipo telaio" },
  { kind: "item", id: "tel-marca", label: "Marca" },
  { kind: "item", id: "tel-modello", label: "Modello" },
  { kind: "group", label: "Sistema" },
  { kind: "item", id: "sys-economici", label: "Parametri economici" },
];

const SETTINGS_NAV_ITEM_COUNT = NAV_STRUCTURE.filter((e) => e.kind === "item").length;

const SETTINGS_NAV_GROUP_LABEL = `${dsTypoSmall} px-2 pt-2 pb-0.5 font-bold uppercase tracking-wider text-[color:var(--cab-text-muted)] first:pt-0`;

const SETTINGS_NAV_BTN =
  "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ease-out";

function SettingsMainPanel({
  pageMode,
  className,
  children,
}: {
  pageMode: boolean;
  className: string;
  children: ReactNode;
}) {
  if (pageMode) return <div className={className}>{children}</div>;
  return <GestionaleModalScrollBody className={className}>{children}</GestionaleModalScrollBody>;
}

function settingsNavBtnClass(active: boolean) {
  return active
    ? `${SETTINGS_NAV_BTN} bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)]`
    : `${SETTINGS_NAV_BTN} text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

function settingsNavGroupForSection(sectionId: SistemaSectionId): string {
  let lastGroup = "";
  for (const e of NAV_STRUCTURE) {
    if (e.kind === "group") lastGroup = e.label;
    else if (e.id === sectionId) return lastGroup;
  }
  return "";
}

function SettingsNavMenuList({
  filteredNav,
  section,
  onPickSection,
  navClassName,
}: {
  filteredNav: NavEntry[];
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  /** Es. drawer modale: `min-h-0 flex-1 max-h-none` */
  navClassName?: string;
}) {
  return (
    <nav
      className={`gestionale-scrollbar space-y-1 overflow-y-auto p-2 ${navClassName ?? "max-h-[min(60vh,22rem)]"}`}
      aria-label="Elenco sezioni configurazione"
    >
      {filteredNav.map((e, i) => {
        if (e.kind === "group") {
          return (
            <p key={`nav-g-${e.label}-${i}`} className={SETTINGS_NAV_GROUP_LABEL}>
              {e.label}
            </p>
          );
        }
        const active = section === e.id;
        return (
          <button
            key={e.id}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => onPickSection(e.id)}
            className={settingsNavBtnClass(active)}
          >
            {e.label}
          </button>
        );
      })}
    </nav>
  );
}

function SettingsMobileSectionPicker({
  open,
  activeLabel,
  onToggle,
  onClose,
  filteredNav,
  section,
  onPickSection,
  navQ,
  setNavQ,
}: {
  open: boolean;
  activeLabel: string;
  onToggle: () => void;
  onClose: () => void;
  filteredNav: NavEntry[];
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
  navQ: string;
  setNavQ: (v: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (rootRef.current?.contains(ev.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative w-full md:hidden">
      <button
        type="button"
        className={`${gestionaleSelectFilterClass} relative block truncate text-left ${open ? "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]" : ""} ${dsFocus}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="settings-mobile-nav-panel"
        aria-haspopup="listbox"
        aria-label={`Sezione configurazione: ${activeLabel}. Apri elenco (${SETTINGS_NAV_ITEM_COUNT} sezioni).`}
      >
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-[color:var(--cab-text-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="sr-only">Sezione: </span>
        {activeLabel}
      </button>

      {open ? (
        <div
          id="settings-mobile-nav-panel"
          role="listbox"
          className="absolute left-0 right-0 top-full z-[var(--ds-z-dropdown,50)] mt-1 overflow-hidden rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-lg"
        >
          <div className="border-b border-[color:var(--cab-border)] p-2">
            <GestionaleSearchField
              value={navQ}
              onChange={(e) => setNavQ(e.target.value)}
              placeholder="Cerca sezione…"
              autoComplete="off"
              aria-label="Cerca nelle sezioni configurazione"
            />
          </div>
          <SettingsNavMenuList
            filteredNav={filteredNav}
            section={section}
            onPickSection={(id) => {
              onPickSection(id);
              onClose();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

const SETTINGS_ADD_INPUT = `${dsInput} min-h-10 min-w-0 flex-1 text-sm`;

function configFieldId(prefix: string, raw: string): string {
  const safe = raw.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "item";
  return `${prefix}-${safe}`;
}

function useSimilarGate() {
  return useSettingsSimilarGate();
}

function ClientiCommercialiList({
  liste,
  setListe,
  nuovo,
  setNuovo,
  onAdd,
  onRemove,
  onRename,
}: {
  liste: MezziListePrefs;
  setListe: React.Dispatch<React.SetStateAction<MezziListePrefs>>;
  nuovo: string;
  setNuovo: (v: string) => void;
  onAdd: (trimmed: string) => void;
  onRemove: (nome: string) => void;
  onRename: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? liste.clienti.filter((v) => v.toLowerCase().includes(t)) : [...liste.clienti];
    return sortStringsItCaseInsensitive(base);
  }, [liste.clienti, q]);

  const tryAdd = (raw: string) => {
    gate(liste.clienti, raw, undefined, () => {
      onAdd(raw.trim());
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(liste.clienti, t, from, () => {
      setListe((prev) => renameClienteInListe(prev, from, t));
      onRename(from, t);
    });
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <h3 className={SETTINGS_SECTION_TITLE}>Clienti</h3>
      <p className={SETTINGS_SECTION_HINT}>
        Sconto ricambi % applicato automaticamente nei preventivi (solo ricambi, non manodopera).
      </p>
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label="Filtra clienti"
      />
      <div className="mt-2 flex gap-1">
        <input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          placeholder="Nuovo cliente"
          className={SETTINGS_ADD_INPUT}
          aria-label="Nuovo cliente"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd(nuovo);
            }
          }}
        />
        <button
          type="button"
          className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
          onClick={() => tryAdd(nuovo)}
        >
          Aggiungi
        </button>
      </div>
      <ul className={SETTINGS_LIST_DIVIDER_UL}>
        {filtered.map((nome) => {
          const sconto = getScontoRicambiCliente(liste, nome);
          return (
            <SettingsEditableStringRow
              key={nome}
              value={nome}
              onRenameBlur={tryRename}
              onRemove={() => setPendingDelete(nome)}
              trailing={
                <label
                  htmlFor={configFieldId("config-sconto-cliente", nome)}
                  className="flex shrink-0 items-center gap-1 text-xs text-[color:var(--cab-text-muted)]"
                >
                  Sconto ricambi %
                  <input
                    id={configFieldId("config-sconto-cliente", nome)}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={1}
                    value={sconto}
                    onChange={(e) => {
                      const n = clampScontoRicambiPercent(Number(e.target.value));
                      setListe((prev) => setScontoRicambiCliente(prev, nome, n));
                    }}
                    className={SETTINGS_DISCOUNT_INPUT}
                    aria-label={`Sconto ricambi per ${nome}`}
                  />
                </label>
              }
            />
          );
        })}
      </ul>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onRemove(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function MagazzinoMarcheList({
  mag,
  setMag,
  nuovo,
  setNuovo,
  onRename,
}: {
  mag: MagazzinoMasterPrefs;
  setMag: React.Dispatch<React.SetStateAction<MagazzinoMasterPrefs>>;
  nuovo: string;
  setNuovo: (v: string) => void;
  onRename: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? mag.marche.filter((v) => v.toLowerCase().includes(t)) : [...mag.marche];
    return sortStringsItCaseInsensitive(base);
  }, [mag.marche, q]);

  const tryAdd = (raw: string) => {
    gate(mag.marche, raw, undefined, () => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setMag((prev) => registerMarcaInMagazzinoMaster(prev, trimmed));
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(mag.marche, t, from, () => {
      setMag((prev) => renameMarcaInMagazzinoMaster(prev, from, t));
      onRename(from, t);
    });
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <h3 className={SETTINGS_SECTION_TITLE}>Marche ricambi</h3>
      <p className={SETTINGS_SECTION_HINT}>
        Sconto % sul prezzo di listino fornitore originale, applicato automaticamente ai ricambi con la stessa marca.
      </p>
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label="Filtra marche ricambi"
      />
      <div className="mt-2 flex gap-1">
        <input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          placeholder="Nuova marca"
          className={SETTINGS_ADD_INPUT}
          aria-label="Nuova marca"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd(nuovo);
            }
          }}
        />
        <button
          type="button"
          className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
          onClick={() => tryAdd(nuovo)}
        >
          Aggiungi
        </button>
      </div>
      <ul className={SETTINGS_LIST_DIVIDER_UL}>
        {filtered.map((nome) => {
          const sconto = getScontoFornitoreMarca(mag, nome);
          return (
            <SettingsEditableStringRow
              key={nome}
              value={nome}
              onRenameBlur={tryRename}
              onRemove={() => setPendingDelete(nome)}
              trailing={
                <label
                  htmlFor={configFieldId("config-sconto-marca", nome)}
                  className="flex shrink-0 items-center gap-1 text-xs text-[color:var(--cab-text-muted)]"
                >
                  Sconto listino %
                  <input
                    id={configFieldId("config-sconto-marca", nome)}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.1}
                    value={sconto}
                    onChange={(e) => {
                      const n = clampScontoRicambiPercent(Number(e.target.value));
                      setMag((prev) => setScontoFornitoreMarca(prev, nome, n));
                    }}
                    className={SETTINGS_DISCOUNT_INPUT}
                    aria-label={`Sconto listino per ${nome}`}
                  />
                </label>
              }
            />
          );
        })}
      </ul>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) setMag((prev) => removeMarcaFromMagazzinoMaster(prev, pendingDelete));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function UnifiedStringList({
  title,
  values,
  nuovo,
  setNuovo,
  placeholder,
  addAriaLabel,
  onAdd,
  onRemove,
  onRename,
}: {
  title: string;
  values: readonly string[];
  nuovo: string;
  setNuovo: (v: string) => void;
  placeholder: string;
  addAriaLabel?: string;
  onAdd: (trimmed: string) => void;
  onRemove: (v: string) => void;
  onRename?: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? values.filter((v) => v.toLowerCase().includes(t)) : [...values];
    return sortStringsItCaseInsensitive(base);
  }, [values, q]);

  const tryAdd = (raw: string) => {
    gate(values, raw, undefined, () => {
      onAdd(raw.trim());
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(values, t, from, () => onRename?.(from, t));
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <h3 className={SETTINGS_SECTION_TITLE}>{title}</h3>
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label={`Filtra elenco: ${title}`}
      />
      <div className="mt-2 flex gap-1">
        <input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          placeholder={placeholder}
          className={SETTINGS_ADD_INPUT}
          aria-label={addAriaLabel ?? placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd(nuovo);
            }
          }}
        />
        <button
          type="button"
          className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
          onClick={() => tryAdd(nuovo)}
        >
          Aggiungi
        </button>
      </div>
      <ul className={SETTINGS_LIST_DIVIDER_UL}>
        {filtered.map((m) => (
          <SettingsEditableStringRow
            key={m}
            value={m}
            onRenameBlur={tryRename}
            onRemove={() => setPendingDelete(m)}
          />
        ))}
      </ul>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onRemove(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function SistemaImpostazioniWorkspace({
  open = true,
  onClose,
  surface = "modal",
}: {
  open?: boolean;
  onClose?: () => void;
  surface?: "modal" | "page";
}) {
  const { authorName } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const queryClient = useQueryClient();
  const mezziListQ = useMezziListQuery(undefined, { enabled: open });
  const [migratePreventiviPending, setMigratePreventiviPending] = useState(false);
  const localPreventiviCount = useMemo(() => {
    if (!open || typeof window === "undefined") return 0;
    return loadPreventivi().length;
  }, [open, migratePreventiviPending]);
  const { setOpen: setSettingsModalOpen } = useSettingsModalOpen();
  const settingsPayload = useCabAppSettingsPayloadQuery();
  const resolvedSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const bulkSave = useSettingsBulkMutation();
  const statiInUsoQ = useLavorazioniStatiInUsoQuery({ enabled: open });
  const pageMode = surface === "page";

  const snapshotRef = useRef<SistemaSettingsSnapshot | null>(null);
  const savedSnapshotRef = useRef<SistemaSettingsSnapshot | null>(null);
  /** Evita reset sezione/stato locale su refetch React Query mentre il modal resta aperto. */
  const hydratedSessionRef = useRef(false);
  const [savedSnapshotKey, setSavedSnapshotKey] = useState<string | null>(null);

  const [section, setSection] = useState<SistemaSectionId>(() => "op-addetti");
  const [navQ, setNavQ] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);

  const attiveStatoIds = useMemo(() => {
    const d = statiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.attivi);
  }, [statiInUsoQ.data]);
  const storicoStatoIds = useMemo(() => {
    const d = statiInUsoQ.data;
    if (!d) return new Set<string>();
    return new Set(d.storico);
  }, [statiInUsoQ.data]);
  const attiviAddetti = useMemo(() => new Set<string>(), []);
  const storicoAddetti = useMemo(() => new Set<string>(), []);

  const [stati, setStati] = useState<StatoLavorazioneConfig[]>(() => [...DEFAULT_STATI_LAVORAZIONI_DB]);
  const [addettiRecords, setAddettiRecords] = useState<AddettoRecord[]>(() => defaultAddettiRecords());
  const [addettoColors, setAddettoColors] = useState<Record<string, string>>(() =>
    syncAddettoColorMap([...DEFAULT_ADDETTI_LAVORAZIONI], undefined),
  );
  const [prioritaColors, setPrioritaColors] = useState<Partial<Record<PrioritaLav, string>>>({});
  const [prioritaDb, setPrioritaDb] = useState<PrioritaLavorazione[]>(() => [...DEFAULT_PRIORITA_LAVORAZIONI_DB]);
  const [lavPrefsHydrated, setLavPrefsHydrated] = useState(false);

  const [mag, setMag] = useState<MagazzinoMasterPrefs>(() => ({
    marche: [],
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
  }));
  const [magHydrated, setMagHydrated] = useState(false);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  const [nuovoFornitore, setNuovoFornitore] = useState("");
  const [nuovoCliente, setNuovoCliente] = useState("");
  const [nuovoUtilizzatore, setNuovoUtilizzatore] = useState("");
  const [nuovoCantiere, setNuovoCantiere] = useState("");
  const [nuovoTipoAttrezzatura, setNuovoTipoAttrezzatura] = useState("");
  const [nuovoTipoTelaio, setNuovoTipoTelaio] = useState("");

  const [liste, setListe] = useState<MezziListePrefs>(() => createMezziListePrefsDefault());
  const [mezziHydrated, setMezziHydrated] = useState(false);

  const [eco, setEco] = useState<SistemaPreventiviDefaults>(() => ({ costoOrarioDefault: 48 }));
  const [ecoHydrated, setEcoHydrated] = useState(false);
  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenzaConfig[]>(() => defaultTipiAssenza());
  const [dipHydrated, setDipHydrated] = useState(false);

  snapshotRef.current = { stati, addettiRecords, addettoColors, prioritaColors, prioritaDb, mag, liste, eco, tipiAssenza };
  const currentSnapshotKey = useMemo(
    () => snapshotKey({ stati, addettiRecords, addettoColors, prioritaColors, prioritaDb, mag, liste, eco, tipiAssenza }),
    [stati, addettiRecords, addettoColors, prioritaColors, prioritaDb, mag, liste, eco, tipiAssenza],
  );
  const allHydrated = lavPrefsHydrated && magHydrated && mezziHydrated && ecoHydrated && dipHydrated;
  const isDirty = allHydrated && savedSnapshotKey != null && currentSnapshotKey !== savedSnapshotKey;

  const handleAddStatoFromLabel = useCallback(
    (label: string) => {
      const next = addStatoFromLabel(stati, label);
      if (!next) {
        gestToast.validation("Stato già presente o nome non valido.");
        return;
      }
      setStati(next);
    },
    [stati],
  );

  useEffect(() => {
    setSettingsModalOpen(open);
    return () => setSettingsModalOpen(false);
  }, [open, setSettingsModalOpen]);

  useEffect(() => {
    if (!open) {
      hydratedSessionRef.current = false;
      return;
    }
    setSection("op-addetti");
    setNavQ("");
    setMobileNavOpen(false);
  }, [open]);

  useEffect(() => {
    if (pageMode) {
      hydratedSessionRef.current = false;
    }
  }, [pageMode]);

  useEffect(() => {
    if (!open) return;
    if (hydratedSessionRef.current) return;
    if (!resolvedSettings && settingsPayload.isPending) return;

    hydratedSessionRef.current = true;
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);
    setDipHydrated(false);

    const r = resolvedSettings ?? resolveCabAppSettingsFromRows([], null);
    const next = snapshotFromResolved(r);
    savedSnapshotRef.current = next;
    setSavedSnapshotKey(snapshotKey(next));

    setStati(next.stati);
    setAddettiRecords(next.addettiRecords);
    setAddettoColors(next.addettoColors);
    setPrioritaColors(next.prioritaColors);
    setPrioritaDb(next.prioritaDb);
    setMag(next.mag);
    setListe(next.liste);
    setEco(next.eco);
    setTipiAssenza(next.tipiAssenza);

    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
    setDipHydrated(true);
  }, [open, resolvedSettings, settingsPayload.isPending]);

  const renameQueueRef = useRef<SettingsRenameEntry[]>([]);
  const [propagaOpen, setPropagaOpen] = useState(false);
  const [propagaPending, setPropagaPending] = useState(false);
  const [propagaEntries, setPropagaEntries] = useState<SettingsRenameEntry[]>([]);

  const queueRename = useCallback((entry: SettingsRenameEntry) => {
    renameQueueRef.current = [
      ...renameQueueRef.current.filter((r) => !(r.kind === entry.kind && r.from === entry.from)),
      entry,
    ];
  }, []);

  const { gate: addettiGate, similarDialog: addettiSimilarDialog } = useSettingsSimilarGate();

  const saveNow = useCallback(async (): Promise<boolean> => {
    const s = snapshotRef.current;
    if (!s || !lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated || !dipHydrated) return false;
    const payload = mergeAppSettingsUpsertWithVersions(
      buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(s)),
      settingsRows,
    );
    suppressSettingsRemoteNotify(8000);
    try {
      await bulkSave.mutateAsync(payload);
    } catch {
      return false;
    }
    appendDashboardSettingsSavedLog(authorName);
    suppressSettingsRemoteNotify(8000);
    savedSnapshotRef.current = s;
    setSavedSnapshotKey(snapshotKey(s));
    return true;
  }, [bulkSave, lavPrefsHydrated, magHydrated, mezziHydrated, ecoHydrated, dipHydrated, settingsRows, authorName]);

  const finalizePropaga = useCallback(async (propagate: boolean) => {
    if (!propagate) {
      renameQueueRef.current = [];
      setPropagaOpen(false);
      gestToast.successSaved();
      return;
    }
    setPropagaPending(true);
    const res = await settingsRenamePropagationService.propagateRenames(renameQueueRef.current);
    setPropagaPending(false);
    setPropagaOpen(false);
    if (!res.success) {
      gestToast.errorOnce("settings-propaga", res.error ?? "Propagazione non riuscita", { action: "update" });
      return;
    }
    const propagatedKinds = renameQueueRef.current.map((e) => e.kind);
    renameQueueRef.current = [];
    invalidateAfterSettingsRenamePropagation(queryClient, propagatedKinds);
    const total = (res.data ?? []).reduce((sum, r) => sum + r.updated, 0);
    gestToast.successOnce(
      "settings-propaga",
      total > 0 ? `Salvataggio completato — ${total} record aggiornati` : "Salvataggio completato",
    );
  }, [gestToast, queryClient]);

  const runPreventiviLocalMigration = useCallback(async () => {
    if (migratePreventiviPending) return;
    const mezziRows = mezziListQ.data ?? [];
    if (mezziRows.length === 0) {
      gestToast.warning("Attendi il caricamento mezzi prima di migrare i preventivi.");
      return;
    }
    if (localPreventiviCount === 0) {
      gestToast.info("Nessun preventivo in localStorage da importare.");
      return;
    }
    const okMigrate = await confirm({
      title: "Importare preventivi locali?",
      message: `Importare ${localPreventiviCount} preventivi da localStorage verso il database? L'operazione è idempotente.`,
      confirmLabel: "Importa",
    });
    if (!okMigrate) return;
    setMigratePreventiviPending(true);
    try {
      const res = await migratePreventiviLocalToDb(mezziRows, {
        queryClient,
        clearLocalOnSuccess: true,
      });
      if (res.errors.length > 0) {
        gestToast.warning(
          `Migrati ${res.migrated}, saltati ${res.skipped}. Primi errori: ${res.errors.slice(0, 2).join("; ")}`,
        );
      } else {
        gestToast.successOnce(
          "settings-migrate-preventivi",
          `Import completato: ${res.migrated} preventivi sincronizzati.`,
        );
      }
    } catch {
      gestToast.errorOnce("settings-migrate-preventivi", "Migrazione preventivi non riuscita.");
    } finally {
      setMigratePreventiviPending(false);
    }
  }, [confirm, gestToast, localPreventiviCount, mezziListQ.data, migratePreventiviPending, queryClient]);

  const applySnapshot = useCallback((s: SistemaSettingsSnapshot) => {
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);
    setDipHydrated(false);
    setStati(s.stati);
    setAddettiRecords(s.addettiRecords);
    setAddettoColors(s.addettoColors);
    setPrioritaColors(s.prioritaColors);
    setPrioritaDb(s.prioritaDb);
    setMag(s.mag);
    setListe(s.liste);
    setEco(s.eco);
    setTipiAssenza(s.tipiAssenza);
    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
    setDipHydrated(true);
  }, []);

  const confirmDiscardChanges = useCallback(async () => {
    if (!isDirty) return true;
    return confirm({
      title: "Uscire senza salvare?",
      message: "Hai modifiche non salvate. Vuoi davvero uscire?",
      destructive: true,
      confirmLabel: "Esci",
    });
  }, [confirm, isDirty]);

  const handleRequestClose = useCallback(() => {
    void confirmDiscardChanges().then((ok) => {
      if (!ok) return;
      onClose?.();
    });
  }, [confirmDiscardChanges, onClose]);

  const handleSaveNow = useCallback(() => {
    void saveNow().then((ok) => {
      if (!ok) {
        gestToast.errorOnce("settings-save", "Salvataggio configurazione non riuscito");
        return;
      }
      if (renameQueueRef.current.length > 0) {
        setPropagaEntries([...renameQueueRef.current]);
        setPropagaOpen(true);
      } else {
        gestToast.successSaved();
      }
    });
  }, [gestToast, saveNow]);

  const handleCancelChanges = useCallback(() => {
    const s = savedSnapshotRef.current;
    if (!s) return;
    void (async () => {
      if (isDirty) {
        const ok = await confirm({
          title: "Annullare modifiche?",
          message: "Tutte le modifiche non salvate verranno perse.",
          destructive: true,
          confirmLabel: "Annulla modifiche",
        });
        if (!ok) return;
      }
      applySnapshot(s);
      setSavedSnapshotKey(snapshotKey(s));
      gestToast.info("Modifiche annullate");
    })();
  }, [applySnapshot, confirm, gestToast, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Hai modifiche non salvate. Vuoi davvero uscire?";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    function onDocumentClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname && anchor.search === window.location.search && anchor.hash === window.location.hash) return;
      void confirmDiscardChanges().then((ok) => {
        if (!ok) return;
        e.preventDefault();
        e.stopPropagation();
        cancelRouteTransition();
      });
      return;
    }
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isDirty, confirmDiscardChanges]);

  useEffect(() => () => cancelRouteTransition(), []);

  const patchMag = useCallback((fn: (prev: MagazzinoMasterPrefs) => MagazzinoMasterPrefs) => {
    setMag(fn);
  }, []);

  const filteredNav = useMemo(() => {
    const q = navQ.trim().toLowerCase();
    if (!q) return NAV_STRUCTURE;
    return NAV_STRUCTURE.filter((e) => (e.kind === "group" ? e.label.toLowerCase().includes(q) : `${e.label}`.toLowerCase().includes(q)));
  }, [navQ]);

  const lavEmbeddedFocus =
    section === "op-addetti" ? "addetti" : section === "op-stati" ? "stati" : section === "op-priorita" ? "priorita" : null;
  const activeSectionLabel = useMemo(() => {
    const entry = NAV_STRUCTURE.find((e): e is Extract<NavEntry, { kind: "item" }> => e.kind === "item" && e.id === section);
    return entry?.label ?? "Sezione";
  }, [section]);

  const magAdd = (key: keyof MagazzinoMasterPrefs, raw: string, clear: () => void): boolean => {
    const next = addUniqueToStringList(mag[key] as string[], raw);
    if (!next) return false;
    patchMag((prev) => ({ ...prev, [key]: next }));
    clear();
    return true;
  };

  const listeAdd = (
    key: "clienti" | "utilizzatori" | "cantieri" | "tipiAttrezzatura" | "tipiTelaio",
    raw: string,
    clear: () => void,
  ): boolean => {
    const cur = (liste[key] as string[] | undefined) ?? [];
    const next = addUniqueToStringList(cur, raw);
    if (!next) return false;
    setListe((prev) => ({ ...prev, [key]: next }));
    clear();
    return true;
  };

  type SettingsDeleteConfirm = {
    label: string;
    detail?: string;
    onConfirm: () => void;
  } | null;
  const [settingsDeleteConfirm, setSettingsDeleteConfirm] = useState<SettingsDeleteConfirm>(null);

  if (!open) return null;

  const settingsModalHeader = !pageMode ? (
    <LavorazioniModalHeader
      title="Configurazione globale"
      subtitle={activeSectionLabel}
      onRequestClose={handleRequestClose}
      actions={
        <>
          <button
            type="button"
            className={`${erpBtnNeutral} h-9 min-w-9 shrink-0 px-2 text-base md:hidden`}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Apri sezioni configurazione"
            aria-expanded={mobileNavOpen}
          >
            ☰
          </button>
          <button
            type="button"
            className={`${erpBtnNeutral} hidden h-9 min-w-9 shrink-0 px-2 text-base md:inline-flex`}
            onClick={() => setDesktopNavOpen((v) => !v)}
            aria-label={desktopNavOpen ? "Comprimi sezioni configurazione" : "Espandi sezioni configurazione"}
            aria-expanded={desktopNavOpen}
          >
            ☰
          </button>
        </>
      }
    />
  ) : null;

  const content = (
    <>
      <div
        className={`relative flex min-h-0 w-full min-w-0 flex-col ${
          pageMode
            ? "overflow-visible rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]"
            : "max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:min-h-0 max-md:flex-1 max-md:overflow-hidden md:h-[min(88dvh,900px)] md:overflow-hidden"
        }`}
      >
        {mobileNavOpen && !pageMode ? (
          <div className="absolute inset-0 z-20 bg-[var(--cab-overlay)] backdrop-blur-[1px] md:hidden" role="presentation" onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileNavOpen(false);
          }}>
            <aside className="flex h-full w-[min(82vw,20rem)] flex-col border-r border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl" aria-label="Sezioni configurazione">
              <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--cab-border)] px-3 py-2.5">
                <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Sezioni</h3>
                <CloseButton onClick={() => setMobileNavOpen(false)} />
              </header>
              <div className="shrink-0 border-b border-[color:var(--cab-border)] p-2">
                <GestionaleSearchField
                  value={navQ}
                  onChange={(e) => setNavQ(e.target.value)}
                  placeholder="Cerca…"
                  autoComplete="off"
                  aria-label="Cerca nelle sezioni configurazione"
                />
              </div>
              <SettingsNavMenuList
                filteredNav={filteredNav}
                section={section}
                navClassName="min-h-0 flex-1 max-h-none"
                onPickSection={(id) => {
                  setSection(id);
                  setMobileNavOpen(false);
                }}
              />
            </aside>
          </div>
        ) : null}

        <div className={pageMode ? "grid gap-4 p-3 md:grid-cols-[15rem_minmax(0,1fr)] md:p-4" : "flex min-h-0 min-w-0 flex-1 overflow-hidden"}>
          <aside
            className={`${desktopNavOpen ? "md:flex" : "md:hidden"} hidden w-[13.75rem] shrink-0 flex-col border-[color:var(--cab-border)] bg-[var(--cab-card)] ${pageMode ? "md:sticky md:top-4 md:h-fit md:w-[15rem] md:rounded-xl md:border md:shadow-[var(--cab-shadow-sm)]" : "border-r"}`}
          >
            <div className="shrink-0 border-b border-[color:var(--cab-border)] p-2">
              <GestionaleSearchField
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cerca…"
                autoComplete="off"
                aria-label="Cerca nelle sezioni configurazione"
              />
            </div>
            <nav
              className={`min-w-0 space-y-1 p-2 ${pageMode ? "" : "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto"}`}
              aria-label="Sezioni configurazione"
            >
              {filteredNav.map((e, i) => {
                if (e.kind === "group") {
                  return (
                    <p key={`g-${e.label}-${i}`} className={SETTINGS_NAV_GROUP_LABEL}>
                      {e.label}
                    </p>
                  );
                }
                const active = section === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setSection(e.id)}
                    className={settingsNavBtnClass(active)}
                  >
                    {e.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <SettingsMainPanel
            pageMode={pageMode}
            className={
              pageMode
                ? "min-w-0 max-w-full bg-transparent"
                : "gestionale-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-2.5 max-sm:[scrollbar-gutter:auto] sm:p-4"
            }
          >
            {pageMode ? (
              <header className="mb-4 min-w-0 border-b border-[color:var(--cab-border)] pb-3">
                <p className={SETTINGS_NAV_GROUP_LABEL}>{settingsNavGroupForSection(section)}</p>
                <h2 className="mt-0.5 text-base font-semibold text-[color:var(--cab-text)]">{activeSectionLabel}</h2>
                {isDirty ? (
                  <p className="mt-2">
                    <span className={dsPageToolbarMetaChipAccent} role="status">
                      Modifiche non salvate
                    </span>
                  </p>
                ) : null}
              </header>
            ) : null}

            {lavEmbeddedFocus ? (
              <SettingsLavorazioniModal
                layout="embedded"
                embeddedFocus={lavEmbeddedFocus}
                stati={stati}
                onAddStatoFromLabel={handleAddStatoFromLabel}
                prioritaDb={prioritaDb}
                prioritaColors={prioritaColors}
                onChangePrioritaDb={(next) => {
                  setPrioritaDb(next);
                }}
                onChangePrioritaColor={(p, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setPrioritaColors((prev) => ({ ...prev, [p]: nh }));
                }}
                onChangeStatoLabel={(id, label) => setStati((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))}
                onChangeStatoColor={(id, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  const nome = stati.find((s) => s.id === id)?.label ?? id;
                  setStati((prev) => prev.map((s) => (s.id === id ? { ...s, color: nh } : s)));
                }}
                onChangeStatoClosed={(id, closed) =>
                  setStati((prev) =>
                    prev.map((s) => {
                      if (s.id !== id) return s;
                      if (closed) return { ...s, closed: true };
                      const { closed: _omit, ...rest } = s;
                      return rest;
                    }),
                  )
                }
                onReorderStato={(from, to) => setStati((prev) => reorderStatiList(prev, from, to))}
                onRemoveStato={(id) => {
                  if (id === STATO_LAVORAZIONE_COMPLETATA_DB) {
                    gestToast.validation("Lo stato «Completata» non può essere eliminato.");
                    return;
                  }
                  if (attiveStatoIds.has(id)) {
                    gestToast.validation("Impossibile eliminare: stato in uso su lavorazioni attive.");
                    return;
                  }
                  if (storicoStatoIds.has(id)) {
                    gestToast.validation("Impossibile eliminare: stato in uso nello storico.");
                    return;
                  }
                  const nome = stati.find((s) => s.id === id)?.label ?? id;
                  setSettingsDeleteConfirm({
                    label: nome,
                    onConfirm: () => {
                      setStati((prev) => prev.filter((s) => s.id !== id));
                      setSettingsDeleteConfirm(null);
                    },
                  });
                }}
                addettiRecords={addettiRecords}
                addettoColors={addettoColors}
                onAddAddetto={({ nome, cognome }) => {
                  const t = nome.trim();
                  if (!t) return;
                  const legacyNomi = addettiLegacyNomi(addettiRecords);
                  addettiGate(legacyNomi, t, undefined, () => {
                    setAddettiRecords((prev) => [
                      ...prev,
                      { id: createAddettoId(), nome: t, cognome: cognome?.trim() || null },
                    ]);
                    setAddettoColors((prev) => assignColorForNewAddetto(prev, t));
                  });
                }}
                onUpdateAddetto={(id, patch) => {
                  const rec = findAddettoById(addettiRecords, id);
                  if (!rec) return;
                  if (patch.nome !== undefined) {
                    const t = patch.nome.trim();
                    if (!t || t === rec.nome) return;
                    const legacyNomi = addettiLegacyNomi(addettiRecords);
                    addettiGate(legacyNomi, t, rec.nome, () => {
                      setAddettiRecords((prev) =>
                        prev.map((r) => (r.id === id ? { ...r, nome: t } : r)),
                      );
                      setAddettoColors((prev) => renameAddettoInColorMap(prev, rec.nome, t));
                      queueRename({ kind: "addetto", from: rec.nome, to: t });
                      dispatchAddettoDisplayRename({ previousName: rec.nome, nextName: t });
                    });
                    return;
                  }
                  if (patch.cognome !== undefined) {
                    setAddettiRecords((prev) =>
                      prev.map((r) =>
                        r.id === id ? { ...r, cognome: patch.cognome?.trim() ? patch.cognome.trim() : null } : r,
                      ),
                    );
                  }
                }}
                onChangeAddettoColor={(nome, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setAddettoColors((prev) => ({ ...prev, [nome]: nh }));
                }}
                onRemoveAddetto={(id) => {
                  const rec = findAddettoById(addettiRecords, id);
                  if (!rec) return;
                  const name = rec.nome;
                  const inUse = attiviAddetti.has(name) || storicoAddetti.has(name);
                  setSettingsDeleteConfirm({
                    label: name,
                    detail: inUse
                      ? "Compare in lavorazioni già registrate. Verrà rimosso solo dalle liste di selezione future; i record esistenti manterranno il nome."
                      : undefined,
                    onConfirm: () => {
                      setAddettiRecords((prev) => prev.filter((r) => r.id !== id));
                      setAddettoColors((prev) => removeAddettoFromColorMap(prev, name));
                      setSettingsDeleteConfirm(null);
                    },
                  });
                }}
                attiviStatoIds={attiveStatoIds}
                storicoStatoIds={storicoStatoIds}
                attiviAddetti={attiviAddetti}
                storicoAddetti={storicoAddetti}
                onRequestClose={handleRequestClose}
              />
            ) : null}

            {section === "op-dipendenti-assenze" ? (
              <div className="w-full min-w-0 max-w-2xl">
                <SettingsDipendentiAssenzeSection tipi={tipiAssenza} onChange={setTipiAssenza} />
              </div>
            ) : null}

            {section === "mag-marche" ? (
              <div className="w-full">
                <MagazzinoMarcheList
                  mag={mag}
                  setMag={setMag}
                  nuovo={nuovaMarca}
                  setNuovo={setNuovaMarca}
                  onRename={(from, to) => queueRename({ kind: "mag_marca", from, to })}
                />
              </div>
            ) : null}

            {section === "mag-fornitori" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Fornitori alternativi"
                  values={mag.fornitori}
                  nuovo={nuovoFornitore}
                  setNuovo={setNuovoFornitore}
                  placeholder="Nuovo fornitore"
                  onAdd={(t) => {
                    if (magAdd("fornitori", t, () => setNuovoFornitore(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, fornitori: prev.fornitori.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) => ({ ...prev, fornitori: renameInStringList(prev.fornitori, from, to) }));
                    queueRename({ kind: "mag_fornitore", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "mag-categorie" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Categorie magazzino"
                  values={mag.categorie}
                  nuovo={nuovaCategoria}
                  setNuovo={setNuovaCategoria}
                  placeholder="Nuova categoria"
                  onAdd={(t) => {
                    if (magAdd("categorie", t, () => setNuovaCategoria(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, categorie: prev.categorie.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) => ({ ...prev, categorie: renameInStringList(prev.categorie, from, to) }));
                    queueRename({ kind: "mag_categoria", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "att-tipo" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Tipo attrezzatura"
                  values={liste.tipiAttrezzatura}
                  nuovo={nuovoTipoAttrezzatura}
                  setNuovo={setNuovoTipoAttrezzatura}
                  placeholder="Nuovo tipo attrezzatura"
                  onAdd={(t) => {
                    if (listeAdd("tipiAttrezzatura", t, () => setNuovoTipoAttrezzatura(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, tipiAttrezzatura: prev.tipiAttrezzatura.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiAttrezzatura: renameInStringList(prev.tipiAttrezzatura, from, to),
                    }));
                    queueRename({ kind: "tipo_attrezzatura", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "att-marca" ? (
              <HierarchyTreeSettingsSection
                treeKey="attrezzature"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to, tree: "attrezzature" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_attrezzature", from, to, marcaContext, tree: "attrezzature" })
                }
              />
            ) : null}

            {section === "att-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="attrezzature"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to, tree: "attrezzature" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_attrezzature", from, to, marcaContext, tree: "attrezzature" })
                }
              />
            ) : null}

            {section === "tel-tipo" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Tipo telaio"
                  values={liste.tipiTelaio ?? []}
                  nuovo={nuovoTipoTelaio}
                  setNuovo={setNuovoTipoTelaio}
                  placeholder="Nuovo tipo telaio"
                  onAdd={(t) => {
                    if (listeAdd("tipiTelaio", t, () => setNuovoTipoTelaio(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiTelaio: (prev.tipiTelaio ?? []).filter((x) => x !== m),
                    }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiTelaio: renameInStringList(prev.tipiTelaio ?? [], from, to),
                    }));
                    queueRename({ kind: "tipo_telaio", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "tel-marca" ? (
              <HierarchyTreeSettingsSection
                treeKey="telai"
                variant="marca"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to, tree: "telai" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_telai", from, to, marcaContext, tree: "telai" })
                }
              />
            ) : null}

            {section === "tel-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="telai"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to, tree: "telai" })}
                onRenameModello={(marcaContext, from, to) =>
                  queueRename({ kind: "hierarchy_modello_telai", from, to, marcaContext, tree: "telai" })
                }
              />
            ) : null}

            {section === "cli-cliente" ? (
              <div className="w-full">
                <ClientiCommercialiList
                  liste={liste}
                  setListe={setListe}
                  nuovo={nuovoCliente}
                  setNuovo={setNuovoCliente}
                  onAdd={(t) => {
                    setListe((prev) => registerClienteInListe(prev, t));
                  }}
                  onRemove={(m) => {
                    setListe((prev) => {
                      const next = removeScontoRicambiCliente(prev, m);
                      return { ...next, clienti: next.clienti.filter((x) => x !== m) };
                    });
                  }}
                  onRename={(from, to) => queueRename({ kind: "cliente", from, to })}
                />
              </div>
            ) : null}

            {section === "cli-utilizzatore" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Utilizzatori"
                  values={liste.utilizzatori}
                  nuovo={nuovoUtilizzatore}
                  setNuovo={setNuovoUtilizzatore}
                  placeholder="Nuovo utilizzatore"
                  onAdd={(t) => {
                    if (listeAdd("utilizzatori", t, () => setNuovoUtilizzatore(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, utilizzatori: prev.utilizzatori.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      utilizzatori: renameInStringList(prev.utilizzatori, from, to),
                    }));
                    queueRename({ kind: "utilizzatore", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "cli-cantiere" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Cantieri"
                  values={liste.cantieri}
                  nuovo={nuovoCantiere}
                  setNuovo={setNuovoCantiere}
                  placeholder="Nuovo cantiere"
                  onAdd={(t) => {
                    if (listeAdd("cantieri", t, () => setNuovoCantiere(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, cantieri: prev.cantieri.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    setListe((prev) => ({
                      ...prev,
                      cantieri: renameInStringList(prev.cantieri, from, to),
                    }));
                    queueRename({ kind: "cantiere", from, to });
                  }}
                />
              </div>
            ) : null}

            {section === "sys-economici" ? (
              <div className="w-full">
                <div className={SETTINGS_SECTION_CARD}>
                  <h3 className={SETTINGS_SECTION_TITLE}>Parametri economici</h3>
                  <label htmlFor="config-costo-orario-default" className="mt-4 block text-xs font-medium text-[color:var(--cab-text-muted)]">
                    Costo manodopera default (€/h)
                    <input
                      id="config-costo-orario-default"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step={0.5}
                      value={eco.costoOrarioDefault}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v <= 0) return;
                        setEco({ costoOrarioDefault: Math.round(v * 100) / 100 });
                      }}
                      className={`${dsInput} mt-1.5 w-full max-w-xs tabular-nums`}
                    />
                  </label>
                </div>
                {/* Admin-only: migrazione one-shot localStorage → DB (non automatica al boot). */}
                <div className={`${SETTINGS_SECTION_CARD} mt-4`}>
                  <h3 className={SETTINGS_SECTION_TITLE}>Migrazione preventivi</h3>
                  <p className={SETTINGS_SECTION_HINT}>
                    Importa i preventivi ancora presenti in localStorage verso Supabase. Operazione idempotente, da
                    eseguire una sola volta per ambiente.
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--cab-text)]">
                    In localStorage: <strong>{localPreventiviCount}</strong> record
                  </p>
                  <button
                    type="button"
                    className={`${erpBtnNeutral} mt-3 text-xs`}
                    disabled={migratePreventiviPending || localPreventiviCount === 0 || mezziListQ.isLoading}
                    onClick={() => void runPreventiviLocalMigration()}
                  >
                    {migratePreventiviPending ? "Import in corso…" : "Importa preventivi locali → DB"}
                  </button>
                </div>
              </div>
            ) : null}
          </SettingsMainPanel>
        </div>
      </div>
      <SettingsEliminaConfirmDialog
        open={settingsDeleteConfirm != null}
        itemLabel={settingsDeleteConfirm?.label}
        detail={settingsDeleteConfirm?.detail}
        onCancel={() => setSettingsDeleteConfirm(null)}
        onConfirm={() => settingsDeleteConfirm?.onConfirm()}
      />
      <SettingsRinominaPropagaDialog
        open={propagaOpen}
        entries={propagaEntries}
        pending={propagaPending}
        onCancel={() => void finalizePropaga(false)}
        onConfirm={() => void finalizePropaga(true)}
      />
      {addettiSimilarDialog}
      {confirmDialog}
    </>
  );

  if (pageMode) {
    return (
      <div className={dsStackPage}>
        <PageHeader
          title="Configurazione"
          belowTitle={
            <>
              <OperatorGlobalSettingsPilotBadge />
              <SettingsMobileSectionPicker
                open={mobileNavOpen}
                activeLabel={activeSectionLabel}
                onToggle={() => setMobileNavOpen((v) => !v)}
                onClose={() => setMobileNavOpen(false)}
                filteredNav={filteredNav}
                section={section}
                onPickSection={setSection}
                navQ={navQ}
                setNavQ={setNavQ}
              />
            </>
          }
          actions={
            <>
              {isDirty ? (
                <span className={`${dsPageToolbarMetaChipAccent} hidden sm:inline-flex`} role="status">
                  Modifiche non salvate
                </span>
              ) : null}
              <button
                type="button"
                className={erpBtnNeutral}
                onClick={handleCancelChanges}
                disabled={!isDirty || bulkSave.isPending}
                title="Ripristina le modifiche non salvate"
              >
                Annulla modifiche
              </button>
              <button
                type="button"
                className={dsBtnPrimary}
                onClick={handleSaveNow}
                disabled={!isDirty || bulkSave.isPending}
                title="Salva tutte le modifiche alla configurazione globale"
                aria-busy={bulkSave.isPending}
              >
                {bulkSave.isPending ? "Salvataggio…" : isDirty ? "Salva modifiche" : "Salva"}
              </button>
            </>
          }
        />
        {content}
      </div>
    );
  }

  return (
    <LavorazioniModalShell
      wide
      alignTop
      maxWidthClass="max-w-6xl"
      onRequestClose={handleRequestClose}
      header={settingsModalHeader ?? undefined}
    >
      {content}
    </LavorazioniModalShell>
  );
}

export function SistemaImpostazioniModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <SistemaImpostazioniWorkspace open={open} onClose={onClose} surface="modal" />;
}

export function SistemaImpostazioniPageView() {
  const permissions = usePermissions();

  if (permissions.isLoading) {
    return <LoadingImpostazioniSkeleton />;
  }

  if (!permissions.canManageSettings) {
    return (
      <div className={dsStackPage}>
        <PageHeader
          title="Configurazione"
          description="Non hai i permessi per modificare la configurazione globale."
          belowTitle={<OperatorGlobalSettingsPilotBadge />}
        />
        <ShellCard title="Accesso negato">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Questa pagina è disponibile solo per utenti autorizzati (admin, manager o operatore in ambiente pilot).
          </p>
          <Link href="/dashboard" className={`mt-4 inline-flex ${erpBtnNeutral}`}>
            Torna alla dashboard
          </Link>
        </ShellCard>
      </div>
    );
  }

  return (
    <div className={dsStackPage}>
      <SistemaImpostazioniWorkspace surface="page" />
    </div>
  );
}
