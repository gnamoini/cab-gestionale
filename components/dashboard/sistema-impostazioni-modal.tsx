"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { LavorazioniModalShell, SettingsLavorazioniModal } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import {
  DEFAULT_ADDETTI_LAVORAZIONI,
  DEFAULT_STATI_LAVORAZIONI,
  LAVORAZIONE_STATO_COMPLETATA_ID,
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
import { MOCK_RICAMBI } from "@/lib/mock-data/magazzino";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { appendDashboardSistemaLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import { AttrezzatureSettingsSection } from "@/components/dashboard/attrezzature-settings-section";
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
import { mergeAppSettingsUpsertWithVersions } from "@/src/services/settings.service";

function mergeMaster(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].sort((x, y) => x.localeCompare(y, "it"));
}

function buildResolvedFromModalSnapshot(s: {
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  mag: MagazzinoMasterPrefs;
  liste: MezziListePrefs;
  eco: SistemaPreventiviDefaults;
}): CabAppSettingsResolved {
  return {
    lavorazioni: {
      stati: s.stati,
      addetti: s.addetti,
      addettoColors: s.addettoColors,
      prioritaColors: s.prioritaColors,
    },
    mezziListe: migrateMezziListePrefs(s.liste),
    magazzinoMaster: s.mag,
    preventiviDefaults: s.eco,
  };
}

function initialMasterFromProducts() {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  const fornitori = new Set<string>();
  for (const r of MOCK_RICAMBI) {
    marche.add(r.marca);
    categorie.add(r.categoria);
    r.compatibilitaMezzi.forEach((m) => mezzi.add(m));
    if (r.fornitoreNonOriginale.trim()) fornitori.add(r.fornitoreNonOriginale.trim());
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
  | "mz-attrezzature"
  | "com-clienti"
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
  { kind: "group", label: "Mezzi" },
  { kind: "item", id: "mz-attrezzature", label: "Attrezzature" },
  { kind: "group", label: "Commerciale" },
  { kind: "item", id: "com-clienti", label: "Clienti" },
  { kind: "group", label: "Sistema" },
  { kind: "item", id: "sys-economici", label: "Parametri economici" },
];

const SETTINGS_CARD =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900";
const LIST_UL =
  "gestionale-scrollbar mt-3 max-h-[min(42vh,18rem)] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800";
const LIST_LI = "flex min-h-[2.75rem] items-center justify-between gap-2 px-1 py-2";
const INPUT_ROW =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-700 dark:bg-zinc-950";

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

export function SistemaImpostazioniModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { authorName } = useAuth();
  const { push } = useToast();
  const settingsPayload = useCabAppSettingsPayloadQuery();
  const resolvedSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const bulkSave = useSettingsBulkMutation();

  const snapshotRef = useRef<{
    stati: StatoLavorazioneConfig[];
    addetti: string[];
    addettoColors: Record<string, string>;
    prioritaColors: Partial<Record<PrioritaLav, string>>;
    mag: MagazzinoMasterPrefs;
    liste: MezziListePrefs;
    eco: SistemaPreventiviDefaults;
  } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True dopo almeno un salvataggio riuscito in sessione; il toast viene mostrato solo alla chiusura del modal. */
  const successfulSaveWhileOpenRef = useRef(false);

  const [section, setSection] = useState<SistemaSectionId>("op-addetti");
  const [navQ, setNavQ] = useState("");

  const attiveStatoIds = useMemo(() => new Set<string>(), []);
  const storicoStatoIds = useMemo(() => new Set<string>(), []);
  const attiviAddetti = useMemo(() => new Set<string>(), []);
  const storicoAddetti = useMemo(() => new Set<string>(), []);

  const [stati, setStati] = useState<StatoLavorazioneConfig[]>(() => [...DEFAULT_STATI_LAVORAZIONI]);
  const [addetti, setAddetti] = useState<string[]>(() => [...DEFAULT_ADDETTI_LAVORAZIONI]);
  const [addettoColors, setAddettoColors] = useState<Record<string, string>>(() =>
    syncAddettoColorMap([...DEFAULT_ADDETTI_LAVORAZIONI], undefined),
  );
  const [prioritaColors, setPrioritaColors] = useState<Partial<Record<PrioritaLav, string>>>({});
  const [lavPrefsHydrated, setLavPrefsHydrated] = useState(false);

  const baseM = useMemo(() => initialMasterFromProducts(), []);
  const [mag, setMag] = useState<MagazzinoMasterPrefs>(() => ({
    marche: [...baseM.marche],
    categorie: [...baseM.categorie],
    mezziCompatibili: [...baseM.mezzi],
    fornitori: [...baseM.fornitori],
  }));
  const [magHydrated, setMagHydrated] = useState(false);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  const [nuovoFornitore, setNuovoFornitore] = useState("");
  const [nuovoCliente, setNuovoCliente] = useState("");

  const [liste, setListe] = useState<MezziListePrefs>(() => createMezziListePrefsDefault());
  const [mezziHydrated, setMezziHydrated] = useState(false);

  const [eco, setEco] = useState<SistemaPreventiviDefaults>(() => ({ costoOrarioDefault: 48 }));
  const [ecoHydrated, setEcoHydrated] = useState(false);

  snapshotRef.current = { stati, addetti, addettoColors, prioritaColors, mag, liste, eco };

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
    if (!open) return;
    successfulSaveWhileOpenRef.current = false;
    setSection("op-addetti");
    setNavQ("");
    setLavPrefsHydrated(false);
    setMagHydrated(false);
    setMezziHydrated(false);
    setEcoHydrated(false);

    const base = initialMasterFromProducts();
    const r = resolvedSettings ?? resolveCabAppSettingsFromRows([], null);

    if (r.lavorazioni.stati?.length) setStati(normalizeStatiList(r.lavorazioni.stati));
    else setStati([...DEFAULT_STATI_LAVORAZIONI]);
    const nextAddetti =
      r.lavorazioni.addetti?.length && r.lavorazioni.addetti.some((a) => a.trim().length > 0)
        ? r.lavorazioni.addetti.map((a) => a.trim()).filter((a) => a.length > 0)
        : [...DEFAULT_ADDETTI_LAVORAZIONI];
    setAddetti(nextAddetti);
    setAddettoColors(syncAddettoColorMap(nextAddetti, r.lavorazioni.addettoColors));
    setPrioritaColors(r.lavorazioni.prioritaColors ?? {});

    setMag({
      marche: mergeMaster(r.magazzinoMaster.marche, base.marche),
      categorie: mergeMaster(r.magazzinoMaster.categorie, base.categorie),
      mezziCompatibili: mergeMaster(r.magazzinoMaster.mezziCompatibili, base.mezzi),
      fornitori: mergeMaster(r.magazzinoMaster.fornitori ?? [], base.fornitori),
    });
    setListe(migrateMezziListePrefs(r.mezziListe));
    setEco(r.preventiviDefaults);

    setLavPrefsHydrated(true);
    setMagHydrated(true);
    setMezziHydrated(true);
    setEcoHydrated(true);
  }, [open, resolvedSettings]);

  useEffect(() => {
    if (!open || !lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const s = snapshotRef.current;
      if (!s) return;
      const payload = mergeAppSettingsUpsertWithVersions(
        buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(s)),
        settingsRows,
      );
      void bulkSave
        .mutateAsync(payload)
        .then(() => {
          successfulSaveWhileOpenRef.current = true;
          dispatchLavorazioniPrefsRefresh();
          dispatchMagazzinoMasterRefresh();
          dispatchMezziListeRefresh();
        })
        .catch(() => {});
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    open,
    lavPrefsHydrated,
    magHydrated,
    mezziHydrated,
    ecoHydrated,
    stati,
    addetti,
    addettoColors,
    prioritaColors,
    mag,
    liste,
    eco,
    settingsRows,
    bulkSave,
  ]);

  const flushSaveNow = useCallback(async () => {
    const s = snapshotRef.current;
    if (!s || !lavPrefsHydrated || !magHydrated || !mezziHydrated || !ecoHydrated) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const payload = buildBulkRowsFromResolved(buildResolvedFromModalSnapshot(s));
    await bulkSave.mutateAsync(payload);
    successfulSaveWhileOpenRef.current = true;
    dispatchLavorazioniPrefsRefresh();
    dispatchMagazzinoMasterRefresh();
    dispatchMezziListeRefresh();
  }, [bulkSave, lavPrefsHydrated, magHydrated, mezziHydrated, ecoHydrated, settingsRows]);

  const handleRequestClose = useCallback(() => {
    void flushSaveNow()
      .catch(() => {})
      .finally(() => {
        if (successfulSaveWhileOpenRef.current) {
          successfulSaveWhileOpenRef.current = false;
          push("Impostazioni salvate", "success", 3400);
        }
        onClose();
      });
  }, [flushSaveNow, onClose, push]);

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

  const listeAdd = (key: "clienti", raw: string, clear: () => void): boolean => {
    const t = raw.trim();
    if (!t) return false;
    if ((liste[key] as string[]).includes(t)) return false;
    setListe((prev) => {
      const cur = prev[key] as string[];
      return { ...prev, [key]: [...cur, t].sort((a, b) => a.localeCompare(b, "it")) };
    });
    clear();
    return true;
  };

  if (!open) return null;

  return (
    <LavorazioniModalShell wide maxWidthClass="max-w-6xl" onRequestClose={handleRequestClose}>
      <div className="flex min-h-0 max-h-[min(92dvh,900px)] w-full min-w-0 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Impostazioni sistema</h2>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-[15.5rem] shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="shrink-0 border-b border-zinc-100 p-2 dark:border-zinc-800">
              <GestionaleSearchField
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cerca…"
                autoComplete="off"
                aria-label="Cerca nelle sezioni impostazioni"
              />
            </div>
            <nav className="gestionale-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Sezioni impostazioni">
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
                    className={`flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      active
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/90"
                    }`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50/60 p-4 dark:bg-zinc-950/50">
            {lavEmbeddedFocus ? (
              <SettingsLavorazioniModal
                layout="embedded"
                embeddedFocus={lavEmbeddedFocus}
                stati={stati}
                prioritaColors={prioritaColors}
                onChangePrioritaColor={(p, hex) => {
                  const nh = normalizeHex(hex);
                  if (!nh) return;
                  setPrioritaColors((prev) => ({ ...prev, [p]: nh }));
                  logDash("update", "AGGIORNAMENTO", "Impostazioni · Priorità", `Colore aggiornato per «${p}»`);
                }}
                onAddStato={(label) => {
                  const t = label.trim();
                  if (!t) return;
                  setStati((prev) => {
                    let n = 1;
                    while (prev.some((s) => s.id === `lav-stato-custom-${n}`)) n += 1;
                    const id = `lav-stato-custom-${n}`;
                    return [...prev, { id, label: t, color: statoThemeColor(id) }];
                  });
                  logDash("create", "AGGIORNAMENTO", "Impostazioni · Lavorazioni", `Aggiunto stato «${t}»`);
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
                  if (id === LAVORAZIONE_STATO_COMPLETATA_ID) {
                    window.alert("Lo stato «Compl.» (completata) non può essere eliminato.");
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
              <div className="mx-auto max-w-lg">
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
              <div className="mx-auto max-w-lg">
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
              <div className="mx-auto max-w-lg">
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

            {section === "mz-attrezzature" ? (
              <AttrezzatureSettingsSection liste={liste} setListe={setListe} logDash={logDash} />
            ) : null}

            {section === "com-clienti" ? (
              <div className="mx-auto max-w-lg">
                <UnifiedStringList
                  title="Clienti"
                  values={liste.clienti}
                  nuovo={nuovoCliente}
                  setNuovo={setNuovoCliente}
                  placeholder="Nuovo cliente"
                  onAdd={(t) => {
                    if (listeAdd("clienti", t, () => setNuovoCliente(""))) {
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Commerciale · Clienti", `Aggiunto «${t}»`);
                    }
                  }}
                  onRemove={(m) => {
                    setListe((prev) => ({ ...prev, clienti: prev.clienti.filter((x) => x !== m) }));
                    logDash("delete", "AGGIORNAMENTO", "Impostazioni · Commerciale · Clienti", `Rimosso «${m}»`);
                  }}
                />
              </div>
            ) : null}

            {section === "sys-economici" ? (
              <div className="mx-auto max-w-md">
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

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={handleRequestClose}>
            Chiudi
          </button>
        </footer>
      </div>
    </LavorazioniModalShell>
  );
}
