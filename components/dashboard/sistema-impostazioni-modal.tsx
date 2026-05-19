"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  setScontoRicambiCliente,
} from "@/lib/mezzi/cliente-commerciale";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { appendDashboardSistemaLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import { HierarchyTreeSettingsSection } from "@/components/dashboard/hierarchy-tree-settings-section";
import { CloseButton } from "@/components/design-system";
import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import {
  dispatchAddettoDisplayRename,
  dispatchLavorazioniPrefsRefresh,
  dispatchMagazzinoMasterRefresh,
  dispatchMezziListeRefresh,
} from "@/lib/sistema/cab-events";
import { erpBtnNeutral, erpBtnSoftOrange } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { buildBulkRowsFromResolved, resolveCabAppSettingsFromRows, type CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { useCabAppSettingsPayloadQuery, useSettingsBulkMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { DEFAULT_STATI_LAVORAZIONI_DB, STATO_LAVORAZIONE_COMPLETATA_DB, statiEnumDisponibiliDaAggiungere } from "@/src/shared/selectors";
import { useLavorazioniStatiInUsoQuery } from "@/src/hooks/gestionale/use-lavorazioni-stati-in-uso";
import { mergeAppSettingsUpsertWithVersions } from "@/src/services/settings.service";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { usePermissions } from "@/src/hooks/use-permissions";
import { dsBtnPrimary, dsStackPage } from "@/lib/ui/design-system";

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
      stati: s.stati,
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

const SETTINGS_CARD =
  "w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900";
const LIST_UL =
  "mt-3 divide-y divide-zinc-100 dark:divide-zinc-800";
const LIST_LI = "flex min-h-[2.5rem] items-center justify-between gap-2 px-1 py-1.5";
const INPUT_ROW =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-700 dark:bg-zinc-950";

function ClientiCommercialiList({
  liste,
  setListe,
  nuovo,
  setNuovo,
  onAdd,
  onRemove,
}: {
  liste: MezziListePrefs;
  setListe: React.Dispatch<React.SetStateAction<MezziListePrefs>>;
  nuovo: string;
  setNuovo: (v: string) => void;
  onAdd: (trimmed: string) => void;
  onRemove: (nome: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [...liste.clienti];
    return liste.clienti.filter((v) => v.toLowerCase().includes(t));
  }, [liste.clienti, q]);

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
        />
        <button
          type="button"
          className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
          onClick={() => {
            const t = nuovo.trim();
            if (!t) return;
            onAdd(t);
          }}
        >
          Aggiungi
        </button>
      </div>
      <ul className={LIST_UL}>
        {filtered.map((nome) => {
          const sconto = getScontoRicambiCliente(liste, nome);
          return (
            <li key={nome} className={`${LIST_LI} flex-wrap`}>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{nome}</span>
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Sconto ricambi %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={sconto}
                  onChange={(e) => {
                    const n = clampScontoRicambiPercent(Number(e.target.value));
                    setListe((prev) => setScontoRicambiCliente(prev, nome, n));
                  }}
                  className="w-16 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  aria-label={`Sconto ricambi per ${nome}`}
                />
              </label>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                onClick={() => onRemove(nome)}
              >
                Elimina
              </button>
            </li>
          );
        })}
      </ul>
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
}: {
  title: string;
  values: readonly string[];
  nuovo: string;
  setNuovo: (v: string) => void;
  placeholder: string;
  onAdd: (trimmed: string) => void;
  onRemove: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [...values];
    return values.filter((v) => v.toLowerCase().includes(t));
  }, [values, q]);

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
        />
        <button
          type="button"
          className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
          onClick={() => {
            const t = nuovo.trim();
            if (!t) return;
            onAdd(t);
          }}
        >
          Aggiungi
        </button>
      </div>
      <ul className={LIST_UL}>
        {filtered.map((m) => (
          <li key={m} className={LIST_LI}>
            <span className="min-w-0 truncate text-xs text-zinc-800 dark:text-zinc-100">{m}</span>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              onClick={() => onRemove(m)}
            >
              Elimina
            </button>
          </li>
        ))}
      </ul>
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

  const statiDisponibiliDaAggiungere = useMemo(
    () => statiEnumDisponibiliDaAggiungere(stati),
    [stati],
  );

  const logDash = useCallback(
    (tone: GestionaleLogEventTone, tipoRiga: string, oggettoRiga: string, modificaRiga: string) => {
      appendDashboardSistemaLog({
        tone,
        tipoRiga: tipoRiga.toUpperCase(),
        oggettoRiga,
        modificaRiga,
        autore: authorName.trim() || "Operatore",
        atIso: new Date().toISOString(),
      });
    },
    [authorName],
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

  const saveNow = useCallback(async () => {
    const s = snapshotRef.current;
    if (!s || !lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated) return;
    const payload = mergeAppSettingsUpsertWithVersions(
      buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(s)),
      settingsRows,
    );
    await bulkSave.mutateAsync(payload);
    savedSnapshotRef.current = s;
    setSavedSnapshotKey(snapshotKey(s));
    dispatchLavorazioniPrefsRefresh();
    dispatchMagazzinoMasterRefresh();
    dispatchMezziListeRefresh();
  }, [bulkSave, lavPrefsHydrated, magHydrated, mezziHydrated, ecoHydrated, settingsRows]);

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
    void saveNow()
      .then(() => push("Impostazioni salvate", "success", 3400))
      .catch(() => push("Salvataggio impostazioni non riuscito", "error", 4200));
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
      if (window.confirm("Hai modifiche non salvate. Vuoi davvero uscire?")) return;
      e.preventDefault();
      e.stopPropagation();
    }
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isDirty]);

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
    const t = raw.trim();
    if (!t) return false;
    if ((mag[key] as string[]).includes(t)) return false;
    patchMag((prev) => {
      const cur = prev[key] as string[];
      return { ...prev, [key]: [...cur, t].sort((a, b) => a.localeCompare(b, "it")) };
    });
    clear();
    return true;
  };

  const listeAdd = (
    key: "clienti" | "utilizzatori" | "cantieri" | "tipiAttrezzatura" | "tipiTelaio",
    raw: string,
    clear: () => void,
  ): boolean => {
    const t = raw.trim();
    if (!t) return false;
    if (((liste[key] as string[] | undefined) ?? []).includes(t)) return false;
    setListe((prev) => {
      const cur = (prev[key] as string[] | undefined) ?? [];
      return { ...prev, [key]: [...cur, t].sort((a, b) => a.localeCompare(b, "it")) };
    });
    clear();
    return true;
  };

  if (!open) return null;

  const content = (
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

        {mobileNavOpen && pageMode ? (
          <aside className="m-3 rounded-xl border border-zinc-200 bg-[var(--cab-card)] shadow-sm dark:border-zinc-800 md:hidden" aria-label="Sezioni impostazioni">
            <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Sezioni</h3>
              <CloseButton onClick={() => setMobileNavOpen(false)} />
            </header>
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <GestionaleSearchField
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cerca…"
                autoComplete="off"
                aria-label="Cerca nelle sezioni impostazioni"
              />
            </div>
            <nav className="space-y-1 p-2" aria-label="Sezioni impostazioni mobile">
              {filteredNav.map((e, i) => {
                if (e.kind === "group") {
                  return (
                    <p key={`pmg-${e.label}-${i}`} className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 first:pt-0 dark:text-zinc-500">
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
        ) : null}

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
                statiDisponibiliDaAggiungere={statiDisponibiliDaAggiungere}
                prioritaDb={prioritaDb}
                prioritaColors={prioritaColors}
                onChangePrioritaDb={(next) => {
                  setPrioritaDb(next);
                  logDash("update", "AGGIORNAMENTO", "Impostazioni · Priorità", `Priorità attive: ${next.join(", ")}`);
                }}
                onChangePrioritaColor={(p, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setPrioritaColors((prev) => ({ ...prev, [p]: nh }));
                  logDash("update", "AGGIORNAMENTO", "Impostazioni · Priorità", `Colore aggiornato per «${p}»`);
                }}
                onAddStato={(pick) => {
                  if (stati.some((s) => s.id === pick.id)) return;
                  setStati((prev) => [
                    ...prev,
                    {
                      id: pick.id,
                      label: pick.label,
                      color: pick.color ?? statoThemeColor(pick.id),
                    },
                  ]);
                  logDash("create", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Aggiunto stato «${pick.label}»`);
                }}
                onChangeStatoLabel={(id, label) => setStati((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)))}
                onChangeStatoColor={(id, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  const nome = stati.find((s) => s.id === id)?.label ?? id;
                  setStati((prev) => prev.map((s) => (s.id === id ? { ...s, color: nh } : s)));
                  logDash("update", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Colore stato aggiornato per «${nome}»`);
                }}
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
                  setStati((prev) => prev.filter((s) => s.id !== id));
                  logDash("delete", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Rimosso stato «${nome}»`);
                }}
                addetti={addetti}
                addettoColors={addettoColors}
                onAddAddetto={(name) => {
                  const t = name.trim();
                  if (!t) return;
                  if (addetti.some((a) => a.trim().toLowerCase() === t.toLowerCase())) {
                    window.alert("Addetto già presente (anche con maiuscole diverse).");
                    return;
                  }
                  setAddetti((prev) => [...prev, t]);
                  setAddettoColors((prev) => assignColorForNewAddetto(prev, t));
                  logDash("create", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Aggiunto addetto ${t.toUpperCase()}`);
                }}
                onRenameAddettoBlur={(previousName, nextName) => {
                  const t = nextName.trim();
                  if (!t || t === previousName) return;
                  if (addetti.some((a) => a !== previousName && a.trim().toLowerCase() === t.toLowerCase())) {
                    window.alert("Nome già utilizzato.");
                    return;
                  }
                  setAddetti((prev) => prev.map((a) => (a === previousName ? t : a)));
                  setAddettoColors((prev) => renameAddettoInColorMap(prev, previousName, t));
                  dispatchAddettoDisplayRename({ previousName, nextName: t });
                  logDash(
                    "update",
                    "AGGIORNAMENTO",
                    "Impostazioni · Lavorazioni",
                    `Rinominato addetto da «${previousName}» a «${t}»`,
                  );
                }}
                onChangeAddettoColor={(nome, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setAddettoColors((prev) => ({ ...prev, [nome]: nh }));
                  logDash("update", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Colore addetto aggiornato per «${nome}»`);
                }}
                onRemoveAddetto={(name) => {
                  const inUse = attiviAddetti.has(name) || storicoAddetti.has(name);
                  if (inUse) {
                    const ok = window.confirm(
                      `«${name}» compare in lavorazioni già registrate. Verrà rimosso solo dalle liste di selezione future; i record esistenti manterranno il nome. Continuare?`,
                    );
                    if (!ok) return;
                  }
                  setAddetti((prev) => prev.filter((a) => a !== name));
                  setAddettoColors((prev) => removeAddettoFromColorMap(prev, name));
                  logDash("delete", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Rimosso addetto «${name}»`);
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Magazzino · Marche", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, marche: prev.marche.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Magazzino · Marche", `Rimosso «${m}»`);
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Magazzino · Fornitori", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, fornitori: prev.fornitori.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Magazzino · Fornitori", `Rimosso «${m}»`);
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Magazzino · Categorie", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    patchMag((prev) => ({ ...prev, categorie: prev.categorie.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Magazzino · Categorie", `Rimosso «${m}»`);
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Attrezzatura · Tipo", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, tipiAttrezzatura: prev.tipiAttrezzatura.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Attrezzatura · Tipo", `Rimosso «${m}»`);
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
                logDash={logDash}
                logLabel="Attrezzatura · Marca"
              />
            ) : null}

            {section === "att-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="attrezzature"
                variant="modello"
                liste={liste}
                setListe={setListe}
                logDash={logDash}
                logLabel="Attrezzatura · Modello"
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Telaio · Tipo", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({
                      ...prev,
                      tipiTelaio: (prev.tipiTelaio ?? []).filter((x) => x !== m),
                    }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Telaio · Tipo", `Rimosso «${m}»`);
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
                logDash={logDash}
                logLabel="Telaio · Marca"
              />
            ) : null}

            {section === "tel-modello" ? (
              <HierarchyTreeSettingsSection
                treeKey="telai"
                variant="modello"
                liste={liste}
                setListe={setListe}
                logDash={logDash}
                logLabel="Telaio · Modello"
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
                    if (liste.clienti.includes(t)) return;
                    setListe((prev) => registerClienteInListe(prev, t));
                    setNuovoCliente("");
                    logDash("create", "AGGIORNAMENTO", "Impostazioni · Commerciale · Clienti", `Aggiunto «${t}»`);
                  }}
                  onRemove={(m) => {
                    setListe((prev) => {
                      const next = removeScontoRicambiCliente(prev, m);
                      return { ...next, clienti: next.clienti.filter((x) => x !== m) };
                    });
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Commerciale · Clienti", `Rimosso «${m}»`);
                  }}
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Commerciale · Utilizzatori", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, utilizzatori: prev.utilizzatori.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Commerciale · Utilizzatori", `Rimosso «${m}»`);
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
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Commerciale · Cantieri", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, cantieri: prev.cantieri.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Commerciale · Cantieri", `Rimosso «${m}»`);
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
                      onBlur={() =>
                        logDash(
                          "update",
                          "AGGIORNAMENTO",
                          "Impostazioni · Preventivi",
                          `Costo manodopera default: ${eco.costoOrarioDefault.toLocaleString("it-IT")} €/h`,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
  );

  if (pageMode) {
    return (
      <div className={dsStackPage}>
        <PageHeader
          title="Impostazioni"
          actions={
            <>
              <button type="button" className={`${erpBtnNeutral} md:hidden`} onClick={() => setMobileNavOpen((v) => !v)}>
                Sezioni
              </button>
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
        <PageHeader title="Impostazioni" description="Area riservata agli amministratori." />
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
