"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LavorazioniModalShell, SettingsLavorazioniModal } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  DEFAULT_ADDETTI_LAVORAZIONI,
} from "@/lib/lavorazioni/constants";
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
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
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
import { SettingsEditableStringRow } from "@/components/dashboard/settings-list-ui";
import { SettingsRinominaPropagaDialog } from "@/components/dashboard/settings-rinomina-propaga-dialog";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { CloseButton } from "@/components/design-system";
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
import { useCabAppSettingsPayloadQuery, useSettingsBulkMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { invalidateAfterPreventiviMutations } from "@/src/lib/react-query/invalidate-related";
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
  dsStackPage,
  dsTypoSmall,
  gestionaleSelectFilterClass,
} from "@/lib/ui/design-system";

function mergeMaster(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].sort((x, y) => x.localeCompare(y, "it"));
}

type SistemaSettingsSnapshot = {
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  prioritaDb: PrioritaLavorazione[];
  mag: MagazzinoMasterPrefs;
  liste: MezziListePrefs;
  eco: SistemaPreventiviDefaults;
};

function buildResolvedFromModalSnapshot(s: SistemaSettingsSnapshot): CabAppSettingsResolved {
  return {
    lavorazioni: {
      stati: normalizeStatiList(s.stati),
      addetti: s.addetti,
      addettoColors: s.addettoColors,
      prioritaColors: s.prioritaColors,
      prioritaDb: s.prioritaDb,
    },
    mezziListe: migrateMezziListePrefs(s.liste),
    magazzinoMaster: s.mag,
    preventiviDefaults: s.eco,
  };
}

function snapshotFromResolved(r: CabAppSettingsResolved): SistemaSettingsSnapshot {
  const addetti =
    r.lavorazioni.addetti?.length && r.lavorazioni.addetti.some((a) => a.trim().length > 0)
      ? r.lavorazioni.addetti.map((a) => a.trim()).filter((a) => a.length > 0)
      : [...DEFAULT_ADDETTI_LAVORAZIONI];
  return {
    stati: r.lavorazioni.stati?.length ? normalizeStatiList(r.lavorazioni.stati) : [...DEFAULT_STATI_LAVORAZIONI_DB],
    addetti,
    addettoColors: syncAddettoColorMap(addetti, r.lavorazioni.addettoColors),
    prioritaColors: r.lavorazioni.prioritaColors ?? {},
    prioritaDb: r.lavorazioni.prioritaDb?.length ? [...r.lavorazioni.prioritaDb] : [...DEFAULT_PRIORITA_LAVORAZIONI_DB],
    mag: {
      marche: [...r.magazzinoMaster.marche],
      categorie: [...r.magazzinoMaster.categorie],
      mezziCompatibili: [...r.magazzinoMaster.mezziCompatibili],
      fornitori: [...(r.magazzinoMaster.fornitori ?? [])],
    },
    liste: migrateMezziListePrefs(r.mezziListe),
    eco: { ...r.preventiviDefaults },
  };
}

function snapshotKey(s: SistemaSettingsSnapshot): string {
  return JSON.stringify(buildResolvedFromModalSnapshot(s));
}

function initialMasterFromProducts(
  src: Array<{
    marca: string;
    categoria: string;
    compatibilitaMezzi: string[];
    fornitoreNonOriginale?: string;
  }> = [],
) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  const fornitori = new Set<string>();
  for (const r of src) {
    if (r.marca?.trim()) marche.add(r.marca.trim());
    if (r.categoria?.trim()) categorie.add(r.categoria.trim());
    r.compatibilitaMezzi.forEach((m) => {
      if (m.trim()) mezzi.add(m.trim());
    });
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
  { kind: "item", id: "op-stati", label: "Stati lavorazioni" },
  { kind: "item", id: "op-priorita", label: "Priorità" },
  { kind: "group", label: "Magazzino" },
  { kind: "item", id: "mag-marche", label: "Marche ricambi" },
  { kind: "item", id: "mag-fornitori", label: "Fornitori alternativi" },
  { kind: "item", id: "mag-categorie", label: "Categorie" },
  { kind: "group", label: "Cliente" },
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

function SettingsNavMenuList({
  filteredNav,
  section,
  onPickSection,
}: {
  filteredNav: NavEntry[];
  section: SistemaSectionId;
  onPickSection: (id: SistemaSectionId) => void;
}) {
  return (
    <nav className="gestionale-scrollbar max-h-[min(60vh,22rem)] space-y-1 overflow-y-auto p-2" aria-label="Elenco sezioni impostazioni">
      {filteredNav.map((e, i) => {
        if (e.kind === "group") {
          return (
            <p
              key={`nav-g-${e.label}-${i}`}
              className={`${dsTypoSmall} px-2 pt-2 pb-0.5 font-bold uppercase tracking-wider text-[color:var(--cab-text-muted)] first:pt-0`}
            >
              {e.label}
            </p>
          );
        }
        const active = section === e.id;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onPickSection(e.id)}
            className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors ${
              active
                ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)]"
                : "text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]"
            }`}
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
        aria-label={`Sezione impostazioni: ${activeLabel}. Apri elenco (${SETTINGS_NAV_ITEM_COUNT} sezioni).`}
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
              aria-label="Cerca nelle sezioni impostazioni"
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

const SETTINGS_CARD =
  "w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900";
const LIST_UL =
  "mt-3 divide-y divide-zinc-100 dark:divide-zinc-800";

function useSimilarGate() {
  return useSettingsSimilarGate();
}

const INPUT_ROW =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-700 dark:bg-zinc-950";

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
    <div className={SETTINGS_CARD}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Clienti</h3>
      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
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
          className={INPUT_ROW}
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
      <ul className={LIST_UL}>
        {filtered.map((nome) => {
          const sconto = getScontoRicambiCliente(liste, nome);
          return (
            <SettingsEditableStringRow
              key={nome}
              value={nome}
              onRenameBlur={tryRename}
              onRemove={() => setPendingDelete(nome)}
              trailing={
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sconto ricambi %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={sconto}
                    onChange={(e) => {
                      const n = clampScontoRicambiPercent(Number(e.target.value));
                      setListe((prev) => setScontoRicambiCliente(prev, nome, n));
                    }}
                    className="w-16 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
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

function UnifiedStringList({
  title,
  values,
  nuovo,
  setNuovo,
  placeholder,
  onAdd,
  onRemove,
  onRename,
}: {
  title: string;
  values: readonly string[];
  nuovo: string;
  setNuovo: (v: string) => void;
  placeholder: string;
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
    <div className={SETTINGS_CARD}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">{title}</h3>
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
          className={INPUT_ROW}
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
      <ul className={LIST_UL}>
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
  const { push } = useToast();
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

  const [section, setSection] = useState<SistemaSectionId>(() => (surface === "page" ? "cli-cliente" : "op-addetti"));
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
  const [addetti, setAddetti] = useState<string[]>(() => [...DEFAULT_ADDETTI_LAVORAZIONI]);
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

  snapshotRef.current = { stati, addetti, addettoColors, prioritaColors, prioritaDb, mag, liste, eco };
  const currentSnapshotKey = useMemo(
    () => snapshotKey({ stati, addetti, addettoColors, prioritaColors, prioritaDb, mag, liste, eco }),
    [stati, addetti, addettoColors, prioritaColors, prioritaDb, mag, liste, eco],
  );
  const allHydrated = lavPrefsHydrated && magHydrated && mezziHydrated && ecoHydrated;
  const isDirty = allHydrated && savedSnapshotKey != null && currentSnapshotKey !== savedSnapshotKey;

  const handleAddStatoFromLabel = useCallback(
    (label: string) => {
      const next = addStatoFromLabel(stati, label);
      if (!next) {
        window.alert("Stato già presente o nome non valido.");
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
    setSection(pageMode ? "cli-cliente" : "op-addetti");
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

    const r = resolvedSettings ?? resolveCabAppSettingsFromRows([], null);
    const next = snapshotFromResolved(r);
    savedSnapshotRef.current = next;
    setSavedSnapshotKey(snapshotKey(next));

    setStati(next.stati);
    setAddetti(next.addetti);
    setAddettoColors(next.addettoColors);
    setPrioritaColors(next.prioritaColors);
    setPrioritaDb(next.prioritaDb);
    setMag(next.mag);
    setListe(next.liste);
    setEco(next.eco);

    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
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
    if (!s || !lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated) return false;
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
  }, [bulkSave, lavPrefsHydrated, magHydrated, mezziHydrated, ecoHydrated, settingsRows, authorName]);

  const finalizePropaga = useCallback(async (propagate: boolean) => {
    if (!propagate) {
      renameQueueRef.current = [];
      setPropagaOpen(false);
      push("Impostazioni salvate", "success", 3400);
      return;
    }
    setPropagaPending(true);
    const res = await settingsRenamePropagationService.propagateRenames(renameQueueRef.current);
    setPropagaPending(false);
    setPropagaOpen(false);
    if (!res.success) {
      push(res.error ?? "Propagazione non riuscita", "error", 5000);
      return;
    }
    renameQueueRef.current = [];
    invalidateAfterPreventiviMutations(queryClient);
    const total = (res.data ?? []).reduce((sum, r) => sum + r.updated, 0);
    push(
      total > 0 ? `Impostazioni salvate — ${total} record aggiornati` : "Impostazioni salvate",
      "success",
      4200,
    );
  }, [push, queryClient]);

  const runPreventiviLocalMigration = useCallback(async () => {
    if (migratePreventiviPending) return;
    const mezziRows = mezziListQ.data ?? [];
    if (mezziRows.length === 0) {
      push("Attendi il caricamento mezzi prima di migrare i preventivi.", "warning", 4200);
      return;
    }
    if (localPreventiviCount === 0) {
      push("Nessun preventivo in localStorage da importare.", "info", 3400);
      return;
    }
    if (
      !window.confirm(
        `Importare ${localPreventiviCount} preventivi da localStorage verso Supabase? L'operazione è idempotente.`,
      )
    ) {
      return;
    }
    setMigratePreventiviPending(true);
    try {
      const res = await migratePreventiviLocalToDb(mezziRows, {
        queryClient,
        clearLocalOnSuccess: true,
      });
      if (res.errors.length > 0) {
        push(
          `Migrati ${res.migrated}, saltati ${res.skipped}. Primi errori: ${res.errors.slice(0, 2).join("; ")}`,
          "warning",
          6000,
        );
      } else {
        push(`Import completato: ${res.migrated} preventivi sincronizzati. localStorage svuotato.`, "success", 5200);
      }
    } catch {
      push("Migrazione preventivi non riuscita.", "error", 5000);
    } finally {
      setMigratePreventiviPending(false);
    }
  }, [localPreventiviCount, mezziListQ.data, migratePreventiviPending, push, queryClient]);

  const applySnapshot = useCallback((s: SistemaSettingsSnapshot) => {
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);
    setStati(s.stati);
    setAddetti(s.addetti);
    setAddettoColors(s.addettoColors);
    setPrioritaColors(s.prioritaColors);
    setPrioritaDb(s.prioritaDb);
    setMag(s.mag);
    setListe(s.liste);
    setEco(s.eco);
    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm("Hai modifiche non salvate. Vuoi davvero uscire?");
  }, [isDirty]);

  const handleRequestClose = useCallback(() => {
    if (!confirmDiscardChanges()) return;
    onClose?.();
  }, [confirmDiscardChanges, onClose]);

  const handleSaveNow = useCallback(() => {
    void saveNow().then((ok) => {
      if (!ok) {
        push("Salvataggio impostazioni non riuscito", "error", 4200);
        return;
      }
      if (renameQueueRef.current.length > 0) {
        setPropagaEntries([...renameQueueRef.current]);
        setPropagaOpen(true);
      } else {
        push("Impostazioni salvate", "success", 3400);
      }
    });
  }, [saveNow, push]);

  const handleCancelChanges = useCallback(() => {
    const s = savedSnapshotRef.current;
    if (!s) return;
    if (isDirty && !window.confirm("Annullare tutte le modifiche non salvate?")) return;
    applySnapshot(s);
    setSavedSnapshotKey(snapshotKey(s));
    push("Modifiche annullate", "info", 2600);
  }, [applySnapshot, isDirty, push]);

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
      if (confirmDiscardChanges()) return;
      e.preventDefault();
      e.stopPropagation();
      cancelRouteTransition();
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

  const content = (
    <>
      <div
        className={`relative flex min-h-0 w-full min-w-0 flex-col ${
          pageMode
            ? "overflow-visible rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]"
            : "h-[calc(100dvh-1.5rem)] overflow-hidden sm:h-[min(88dvh,900px)]"
        }`}
      >
        <header className={`${pageMode ? "hidden" : "shrink-0 border-b border-zinc-200 bg-[var(--cab-card)] px-3 py-2.5 dark:border-zinc-800 sm:px-4 sm:py-3"}`}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className={`${erpBtnNeutral} h-9 min-w-9 shrink-0 px-2 text-base md:hidden`}
                onClick={() => setMobileNavOpen(true)}
                aria-label="Apri sezioni impostazioni"
                aria-expanded={mobileNavOpen}
              >
                ☰
              </button>
              <button
                type="button"
                className={`${erpBtnNeutral} hidden h-9 min-w-9 shrink-0 px-2 text-base md:inline-flex`}
                onClick={() => setDesktopNavOpen((v) => !v)}
                aria-label={desktopNavOpen ? "Comprimi sezioni impostazioni" : "Espandi sezioni impostazioni"}
                aria-expanded={desktopNavOpen}
              >
                ☰
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">Impostazioni globali</h2>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{activeSectionLabel}</p>
              </div>
            </div>
            <CloseButton onClick={handleRequestClose} />
          </div>
        </header>

        {mobileNavOpen && !pageMode ? (
          <div className="absolute inset-0 z-20 bg-[var(--cab-overlay)] backdrop-blur-[1px] md:hidden" role="presentation" onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileNavOpen(false);
          }}>
            <aside className="flex h-full w-[min(82vw,20rem)] flex-col border-r border-zinc-200 bg-[var(--cab-card)] shadow-2xl dark:border-zinc-800" aria-label="Sezioni impostazioni">
              <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Sezioni</h3>
                <CloseButton onClick={() => setMobileNavOpen(false)} />
              </header>
              <div className="shrink-0 border-b border-zinc-100 p-2 dark:border-zinc-800">
                <GestionaleSearchField
                  value={navQ}
                  onChange={(e) => setNavQ(e.target.value)}
                  placeholder="Cerca…"
                  autoComplete="off"
                  aria-label="Cerca nelle sezioni impostazioni"
                />
              </div>
              <nav className="gestionale-scrollbar flex-1 space-y-1 overflow-y-auto p-2" aria-label="Sezioni impostazioni mobile">
                {filteredNav.map((e, i) => {
                  if (e.kind === "group") {
                    return (
                      <p key={`mg-${e.label}-${i}`} className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 first:pt-0 dark:text-zinc-500">
                        {e.label}
                      </p>
                    );
                  }
                  const active = section === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setSection(e.id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold transition-colors ${
                        active ? "border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[var(--cab-primary)] text-white shadow-sm hover:brightness-[1.06]" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/90"
                      }`}
                    >
                      {e.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className={pageMode ? "grid gap-4 p-3 md:grid-cols-[15rem_minmax(0,1fr)] md:p-4" : "flex min-h-0 flex-1 overflow-hidden"}>
          <aside className={`${desktopNavOpen ? "md:flex" : "md:hidden"} hidden w-[13.75rem] shrink-0 flex-col border-r border-zinc-200 bg-[var(--cab-card)] dark:border-zinc-800 ${pageMode ? "md:sticky md:top-4 md:h-fit md:w-auto md:rounded-xl md:border md:shadow-sm" : ""}`}>
            <div className="shrink-0 border-b border-zinc-100 p-2 dark:border-zinc-800">
              <GestionaleSearchField
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cerca…"
                autoComplete="off"
                aria-label="Cerca nelle sezioni impostazioni"
              />
            </div>
            <nav className={`${pageMode ? "space-y-0.5 p-2" : "gestionale-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2"}`} aria-label="Sezioni impostazioni">
              {filteredNav.map((e, i) => {
                if (e.kind === "group") {
                  return (
                    <p
                      key={`g-${e.label}-${i}`}
                      className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 first:pt-0 dark:text-zinc-500"
                    >
                      {e.label}
                    </p>
                  );
                }
                const active = section === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSection(e.id)}
                    className={`flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      active
                        ? "border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[var(--cab-primary)] text-white shadow-sm hover:brightness-[1.06]"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/90"
                    }`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className={pageMode ? "min-w-0 bg-transparent" : "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50/60 p-2.5 [scrollbar-gutter:stable] dark:bg-zinc-950/50 sm:p-4"}>
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
                    window.alert("Lo stato «Completata» non può essere eliminato.");
                    return;
                  }
                  if (attiveStatoIds.has(id)) {
                    window.alert("Impossibile eliminare: stato in uso su lavorazioni attive.");
                    return;
                  }
                  if (storicoStatoIds.has(id)) {
                    window.alert("Impossibile eliminare: stato in uso nello storico.");
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
                addetti={addetti}
                addettoColors={addettoColors}
                onAddAddetto={(name) => {
                  const t = name.trim();
                  if (!t) return;
                  addettiGate(addetti, t, undefined, () => {
                    setAddetti((prev) => [...prev, t]);
                    setAddettoColors((prev) => assignColorForNewAddetto(prev, t));
                  });
                }}
                onRenameAddettoBlur={(previousName, nextName) => {
                  const t = nextName.trim();
                  if (!t || t === previousName) return;
                  addettiGate(addetti, t, previousName, () => {
                    setAddetti((prev) => prev.map((a) => (a === previousName ? t : a)));
                    setAddettoColors((prev) => renameAddettoInColorMap(prev, previousName, t));
                    queueRename({ kind: "addetto", from: previousName, to: t });
                    dispatchAddettoDisplayRename({ previousName, nextName: t });
                  });
                }}
                onChangeAddettoColor={(nome, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setAddettoColors((prev) => ({ ...prev, [nome]: nh }));
                }}
                onRemoveAddetto={(name) => {
                  const inUse = attiviAddetti.has(name) || storicoAddetti.has(name);
                  setSettingsDeleteConfirm({
                    label: name,
                    detail: inUse
                      ? "Compare in lavorazioni già registrate. Verrà rimosso solo dalle liste di selezione future; i record esistenti manterranno il nome."
                      : undefined,
                    onConfirm: () => {
                      setAddetti((prev) => prev.filter((a) => a !== name));
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

            {section === "mag-marche" ? (
              <div className="w-full">
                <UnifiedStringList
                  title="Marche ricambi"
                  values={mag.marche}
                  nuovo={nuovaMarca}
                  setNuovo={setNuovaMarca}
                  placeholder="Nuova marca"
                  onAdd={(t) => {
                    if (magAdd("marche", t, () => setNuovaMarca(""))) {
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, marche: prev.marche.filter((x) => x !== m) }));
                  }}
                  onRename={(from, to) => {
                    patchMag((prev) => ({ ...prev, marche: renameInStringList(prev.marche, from, to) }));
                    queueRename({ kind: "mag_marca", from, to });
                  }}
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
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to })}
                onRenameModello={(from, to) => queueRename({ kind: "hierarchy_modello_attrezzature", from, to })}
              />
            ) : null}

            {section === "att-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="attrezzature"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_attrezzature", from, to })}
                onRenameModello={(from, to) => queueRename({ kind: "hierarchy_modello_attrezzature", from, to })}
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
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to })}
                onRenameModello={(from, to) => queueRename({ kind: "hierarchy_modello_telai", from, to })}
              />
            ) : null}

            {section === "tel-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="telai"
                variant="modello"
                liste={liste}
                setListe={setListe}
                onRenameMarca={(from, to) => queueRename({ kind: "hierarchy_marca_telai", from, to })}
                onRenameModello={(from, to) => queueRename({ kind: "hierarchy_modello_telai", from, to })}
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
                <div className={SETTINGS_CARD}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                    Parametri economici
                  </h3>
                  <label className="mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Costo manodopera default (€/h)
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={eco.costoOrarioDefault}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v <= 0) return;
                        setEco({ costoOrarioDefault: Math.round(v * 100) / 100 });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                </div>
                {/* Admin-only: migrazione one-shot localStorage → DB (non automatica al boot). */}
                <div className={`${SETTINGS_CARD} mt-4`}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                    Migrazione preventivi
                  </h3>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Importa i preventivi ancora presenti in localStorage verso Supabase. Operazione idempotente, da
                    eseguire una sola volta per ambiente.
                  </p>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
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
          </div>
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
    </>
  );

  if (pageMode) {
    return (
      <div className={dsStackPage}>
        <PageHeader
          title="Impostazioni"
          belowTitle={
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
          }
          actions={
            <>
              <button type="button" className={erpBtnNeutral} onClick={handleCancelChanges} disabled={!isDirty || bulkSave.isPending}>
                Annulla modifiche
              </button>
              <button type="button" className={dsBtnPrimary} onClick={handleSaveNow} disabled={!isDirty || bulkSave.isPending}>
                {bulkSave.isPending ? "Salvataggio…" : "Salva"}
              </button>
            </>
          }
        />
        {content}
      </div>
    );
  }

  return (
    <LavorazioniModalShell wide alignTop maxWidthClass="max-w-6xl" onRequestClose={handleRequestClose}>
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
    return (
      <div className={dsStackPage}>
        <PageHeader title="Impostazioni" description="Caricamento permessi…" />
      </div>
    );
  }

  if (!permissions.canManageSettings) {
    return (
      <div className={dsStackPage}>
        <PageHeader title="Impostazioni" description="Non hai i permessi per modificare le impostazioni globali." />
        <ShellCard title="Accesso negato">
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Questa pagina è disponibile solo per utenti con ruolo <strong className="text-[color:var(--cab-text)]">admin</strong>.
          </p>
          <Link href="/dashboard" className={`mt-4 inline-flex ${erpBtnNeutral}`}>
            Torna alla dashboard
          </Link>
        </ShellCard>
      </div>
    );
  }

  return <SistemaImpostazioniWorkspace surface="page" />;
}
